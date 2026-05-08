import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";
import { AppointmentStatus, UserRole } from "@prisma/client";

@Injectable()
export class AppointmentService {
  private readonly APPOINTMENT_LOCK_PREFIX = "appointment:lock";
  private readonly LOCK_TTL = 10;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private getAppointmentLockKey(
    doctorId: number,
    appointmentDate: string,
    startTime: string,
  ): string {
    return `${this.APPOINTMENT_LOCK_PREFIX}:${doctorId}:${appointmentDate}:${startTime}`;
  }

  private async tryAcquireLockWithRetry(
    key: string,
    maxRetries: number = 5,
    retryDelayMs: number = 200,
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const acquired = await this.redisService.acquireLock(key, this.LOCK_TTL);
      if (acquired) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
    return false;
  }

  private formatAppointment(appointment: any) {
    return {
      ...appointment,
      date: appointment.appointmentDate
        ? appointment.appointmentDate.toISOString().split("T")[0]
        : null,
    };
  }

  private formatAppointments(appointments: any[]) {
    return appointments.map((apt) => this.formatAppointment(apt));
  }

  async create(createAppointmentDto: CreateAppointmentDto, userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      throw new ForbiddenException("只有患者可以预约");
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: createAppointmentDto.doctorId },
    });

    if (!doctor || !doctor.isActive) {
      throw new NotFoundException("医生不存在或已停诊");
    }

    const targetDate = new Date(createAppointmentDto.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      throw new BadRequestException("不能预约过去的日期");
    }

    const lockKey = this.getAppointmentLockKey(
      createAppointmentDto.doctorId,
      createAppointmentDto.appointmentDate,
      createAppointmentDto.startTime,
    );

    const lockAcquired = await this.tryAcquireLockWithRetry(lockKey);
    if (!lockAcquired) {
      throw new BadRequestException("预约繁忙，请稍后重试");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingAppointments = await tx.appointment.findMany({
          where: {
            doctorId: createAppointmentDto.doctorId,
            appointmentDate: {
              gte: new Date(createAppointmentDto.appointmentDate + "T00:00:00"),
              lte: new Date(createAppointmentDto.appointmentDate + "T23:59:59"),
            },
            startTime: createAppointmentDto.startTime,
            status: {
              in: [
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.IN_PROGRESS,
              ],
            },
          },
        });

        const schedule = await tx.schedule.findFirst({
          where: {
            doctorId: createAppointmentDto.doctorId,
            startTime: createAppointmentDto.startTime,
          },
        });

        const maxAppointments = schedule?.maxAppointments || 5;
        if (existingAppointments.length >= maxAppointments) {
          throw new BadRequestException("该时段预约已满");
        }

        const appointment = await tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: createAppointmentDto.doctorId,
            scheduleId: createAppointmentDto.scheduleId,
            appointmentDate: new Date(createAppointmentDto.appointmentDate),
            startTime: createAppointmentDto.startTime,
            endTime: createAppointmentDto.endTime,
            symptoms: createAppointmentDto.symptoms,
            status: AppointmentStatus.PENDING,
          },
          include: {
            doctor: {
              include: {
                department: true,
                user: { select: { realName: true, avatar: true } },
              },
            },
            patient: {
              include: {
                user: { select: { realName: true, avatar: true } },
              },
            },
          },
        });

        return this.formatAppointment(appointment);
      });
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async findByPatient(patientId: number) {
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            department: true,
            user: { select: { realName: true, avatar: true } },
          },
        },
        medicalRecord: true,
        review: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return this.formatAppointments(appointments);
  }

  async findByDoctor(doctorId: number, status?: AppointmentStatus) {
    const where: any = { doctorId };
    if (status) {
      where.status = status;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            user: { select: { realName: true, avatar: true, phone: true } },
          },
        },
        medicalRecord: true,
      },
      orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
    });
    return this.formatAppointments(appointments);
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: {
          include: {
            department: true,
            user: { select: { realName: true, avatar: true, phone: true } },
          },
        },
        patient: {
          include: {
            user: { select: { realName: true, avatar: true, phone: true } },
          },
        },
        medicalRecord: true,
        review: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException("预约不存在");
    }

    return this.formatAppointment(appointment);
  }

  async updateStatus(
    id: number,
    updateAppointmentStatusDto: UpdateAppointmentStatusDto,
    userId: number,
    userRole: UserRole,
  ) {
    const appointment = await this.findOne(id);

    if (userRole === UserRole.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId },
      });
      if (appointment.patientId !== patient?.id) {
        throw new ForbiddenException("无权操作此预约");
      }

      if (updateAppointmentStatusDto.status !== AppointmentStatus.CANCELLED) {
        throw new ForbiddenException("患者只能取消预约");
      }

      const appointmentDate = new Date(appointment.appointmentDate);
      const now = new Date();
      if (appointmentDate <= now) {
        throw new BadRequestException("就诊时间已过，无法取消");
      }
    }

    if (userRole === UserRole.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
      if (appointment.doctorId !== doctor?.id) {
        throw new ForbiddenException("无权操作此预约");
      }

      const validTransitions = {
        [AppointmentStatus.PENDING]: [
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CANCELLED,
        ],
        [AppointmentStatus.CONFIRMED]: [
          AppointmentStatus.IN_PROGRESS,
          AppointmentStatus.CANCELLED,
        ],
        [AppointmentStatus.IN_PROGRESS]: [
          AppointmentStatus.COMPLETED,
          AppointmentStatus.CANCELLED,
        ],
      };

      const validStatuses = validTransitions[appointment.status] || [];
      if (!validStatuses.includes(updateAppointmentStatusDto.status)) {
        throw new BadRequestException("无效的状态变更");
      }
    }

    const updateData: any = {
      status: updateAppointmentStatusDto.status,
    };

    if (updateAppointmentStatusDto.rejectReason) {
      updateData.rejectReason = updateAppointmentStatusDto.rejectReason;
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        doctor: {
          include: {
            department: true,
            user: { select: { realName: true, avatar: true } },
          },
        },
        patient: {
          include: {
            user: { select: { realName: true, avatar: true } },
          },
        },
        medicalRecord: true,
      },
    });
    return this.formatAppointment(updatedAppointment);
  }

  async findAll(status?: AppointmentStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        doctor: {
          include: {
            department: true,
            user: { select: { realName: true } },
          },
        },
        patient: {
          include: {
            user: { select: { realName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return this.formatAppointments(appointments);
  }
}
