import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AppointmentStatus, UserRole } from '@prisma/client';

@Injectable()
export class ReviewService {
  private readonly HOT_DOCTORS_CACHE_KEY = 'hot:doctors';

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createReviewDto: CreateReviewDto, userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      throw new ForbiddenException('只有患者可以评价');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: createReviewDto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('预约不存在');
    }

    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('无权评价此预约');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('只有已完成的预约可以评价');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { appointmentId: createReviewDto.appointmentId },
    });

    if (existingReview) {
      throw new BadRequestException('该预约已评价');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          appointmentId: createReviewDto.appointmentId,
          patientId: patient.id,
          doctorId: appointment.doctorId,
          rating: createReviewDto.rating,
          content: createReviewDto.content || createReviewDto.comment || '',
        },
      });

      const allReviews = await tx.review.findMany({
        where: { doctorId: appointment.doctorId },
      });

      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await tx.doctor.update({
        where: { id: appointment.doctorId },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: allReviews.length,
        },
      });

      return newReview;
    });

    await this.redisService.del(this.HOT_DOCTORS_CACHE_KEY);

    return review;
  }

  async findByDoctor(doctorId: number) {
    return this.prisma.review.findMany({
      where: { doctorId },
      include: {
        patient: {
          include: {
            user: { select: { realName: true, avatar: true } },
          },
        },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const review = await this.prisma.review.findUnique({
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

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    return review;
  }

  async findByAppointment(appointmentId: number) {
    return this.prisma.review.findUnique({
      where: { appointmentId },
      include: {
        patient: {
          include: {
            user: { select: { realName: true, avatar: true } },
          },
        },
      },
    });
  }
}
