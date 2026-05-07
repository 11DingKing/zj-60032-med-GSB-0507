import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { AppointmentStatus, UserRole } from '@prisma/client';

@Injectable()
export class MedicalRecordService {
  constructor(private prisma: PrismaService) {}

  async create(createMedicalRecordDto: CreateMedicalRecordDto, userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new ForbiddenException('只有医生可以填写问诊记录');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: createMedicalRecordDto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('预约不存在');
    }

    if (appointment.doctorId !== doctor.id) {
      throw new ForbiddenException('无权操作此预约');
    }

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException('只有就诊中的预约可以填写问诊记录');
    }

    const existingRecord = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: createMedicalRecordDto.appointmentId },
    });

    if (existingRecord) {
      throw new BadRequestException('该预约已有问诊记录');
    }

    const medicalRecord = await this.prisma.$transaction(async (tx) => {
      const record = await tx.medicalRecord.create({
        data: {
          appointmentId: createMedicalRecordDto.appointmentId,
          patientId: appointment.patientId,
          doctorId: doctor.id,
          chiefComplaint: createMedicalRecordDto.chiefComplaint,
          diagnosis: createMedicalRecordDto.diagnosis,
          prescription: createMedicalRecordDto.prescription,
          advice: createMedicalRecordDto.advice,
        },
      });

      await tx.appointment.update({
        where: { id: createMedicalRecordDto.appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      return record;
    });

    return medicalRecord;
  }

  async findByPatient(patientId: number) {
    return this.prisma.medicalRecord.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            department: true,
            user: { select: { realName: true, avatar: true } },
          },
        },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id },
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
        appointment: true,
      },
    });

    if (!medicalRecord) {
      throw new NotFoundException('问诊记录不存在');
    }

    return medicalRecord;
  }

  async findByAppointment(appointmentId: number) {
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId },
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

    return medicalRecord;
  }
}
