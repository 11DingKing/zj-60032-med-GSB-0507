import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { CopyScheduleDto } from "./dto/copy-schedule.dto";
import { AppointmentStatus } from "@prisma/client";

@Injectable()
export class ScheduleService {
  private readonly SCHEDULE_CACHE_PREFIX = "schedule:doctor";
  private readonly CACHE_TTL = 600;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private getCacheKey(doctorId: number): string {
    return `${this.SCHEDULE_CACHE_PREFIX}:${doctorId}`;
  }

  async create(createScheduleDto: CreateScheduleDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: createScheduleDto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException("医生不存在");
    }

    const existing = await this.prisma.schedule.findFirst({
      where: {
        doctorId: createScheduleDto.doctorId,
        weekDay: createScheduleDto.weekDay,
        startTime: createScheduleDto.startTime,
        weekStartDate: null,
      },
    });

    if (existing) {
      throw new ConflictException("该时段已有排班");
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        doctorId: createScheduleDto.doctorId,
        weekDay: createScheduleDto.weekDay,
        startTime: createScheduleDto.startTime,
        endTime: createScheduleDto.endTime,
        maxAppointments: createScheduleDto.maxAppointments || 5,
      },
    });

    await this.redisService.del(this.getCacheKey(createScheduleDto.doctorId));
    return schedule;
  }

  async findByDoctor(doctorId: number) {
    const cacheKey = this.getCacheKey(doctorId);
    const cached = await this.redisService.getJson<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const schedules = await this.prisma.schedule.findMany({
      where: { doctorId, weekStartDate: null },
      orderBy: [{ weekDay: "asc" }, { startTime: "asc" }],
    });

    await this.redisService.setJson(cacheKey, schedules, this.CACHE_TTL);
    return schedules;
  }

  async getAvailableSlots(doctorId: number, date: string) {
    const targetDate = new Date(date);
    const weekDay = targetDate.getDay();
    const adjustedWeekDay = weekDay === 0 ? 7 : weekDay;

    const schedules = await this.prisma.schedule.findMany({
      where: {
        doctorId,
        weekDay: adjustedWeekDay,
        weekStartDate: null,
      },
      orderBy: { startTime: "asc" },
    });

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: new Date(date + "T00:00:00"),
          lte: new Date(date + "T23:59:59"),
        },
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
    });

    const slotAppointmentCount: Record<string, number> = {};
    for (const appt of appointments) {
      slotAppointmentCount[appt.startTime] =
        (slotAppointmentCount[appt.startTime] || 0) + 1;
    }

    return schedules.map((schedule) => ({
      ...schedule,
      currentAppointments: slotAppointmentCount[schedule.startTime] || 0,
      isAvailable:
        (slotAppointmentCount[schedule.startTime] || 0) <
        schedule.maxAppointments,
    }));
  }

  async copyToNextWeek(copyScheduleDto: CopyScheduleDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: copyScheduleDto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException("医生不存在");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();

    const daysToAddForNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + daysToAddForNextMonday);

    const sourceSchedules = await this.prisma.schedule.findMany({
      where: {
        doctorId: copyScheduleDto.doctorId,
        weekDay: { in: copyScheduleDto.sourceWeekDays },
        weekStartDate: null,
      },
    });

    const createdSchedules = [];
    for (const schedule of sourceSchedules) {
      const nextWeekSchedule = await this.prisma.schedule.upsert({
        where: {
          doctorId_weekDay_startTime_weekStartDate: {
            doctorId: schedule.doctorId,
            weekDay: schedule.weekDay,
            startTime: schedule.startTime,
            weekStartDate: nextWeekStart,
          },
        },
        update: {
          endTime: schedule.endTime,
          maxAppointments: schedule.maxAppointments,
        },
        create: {
          doctorId: schedule.doctorId,
          weekDay: schedule.weekDay,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          maxAppointments: schedule.maxAppointments,
          weekStartDate: nextWeekStart,
        },
      });
      createdSchedules.push(nextWeekSchedule);
    }

    await this.redisService.del(this.getCacheKey(copyScheduleDto.doctorId));
    return {
      message: `成功复制 ${createdSchedules.length} 条排班到下一周`,
      schedules: createdSchedules,
    };
  }

  async remove(id: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException("排班不存在");
    }

    await this.prisma.schedule.delete({ where: { id } });
    await this.redisService.del(this.getCacheKey(schedule.doctorId));

    return { message: "删除成功" };
  }

  async batchCreate(doctorId: number, schedules: CreateScheduleDto[]) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException("医生不存在");
    }

    await this.prisma.schedule.deleteMany({
      where: { doctorId, weekStartDate: null },
    });

    const createdSchedules = [];
    for (const schedule of schedules) {
      const newSchedule = await this.prisma.schedule.create({
        data: {
          doctorId,
          weekDay: schedule.weekDay,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          maxAppointments: schedule.maxAppointments || 5,
        },
      });
      createdSchedules.push(newSchedule);
    }

    await this.redisService.del(this.getCacheKey(doctorId));
    return createdSchedules;
  }
}
