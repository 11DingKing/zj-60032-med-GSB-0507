import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAppointmentsByDepartment() {
    const departments = await this.prisma.department.findMany({
      include: {
        doctors: {
          include: {
            appointments: true,
          },
        },
      },
    });

    return departments.map(dept => ({
      departmentId: dept.id,
      departmentName: dept.name,
      appointmentCount: dept.doctors.reduce((sum, doctor) => sum + doctor.appointments.length, 0),
    }));
  }

  async getDailyAppointmentTrend(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    const dateMap = new Map<string, number>();
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
    }

    for (const appt of appointments) {
      const dateStr = appt.appointmentDate.toISOString().split('T')[0];
      const count = dateMap.get(dateStr) || 0;
      dateMap.set(dateStr, count + 1);
    }

    return Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  async getDoctorRatingRanking(limit: number = 10) {
    const doctors = await this.prisma.doctor.findMany({
      where: {
        reviewCount: { gt: 0 },
      },
      include: {
        department: true,
        user: {
          select: { realName: true, avatar: true },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    });

    return doctors.map(doctor => ({
      doctorId: doctor.id,
      doctorName: doctor.user.realName,
      avatar: doctor.avatar || doctor.user.avatar,
      title: doctor.title,
      specialty: doctor.specialty,
      departmentName: doctor.department.name,
      rating: doctor.rating,
      reviewCount: doctor.reviewCount,
    }));
  }

  async getAppointmentStatusDistribution() {
    const statuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
    ];

    const result = [];
    for (const status of statuses) {
      const count = await this.prisma.appointment.count({
        where: { status },
      });
      result.push({
        status,
        count,
      });
    }

    return result;
  }

  async getDashboardStats() {
    const [
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      totalDoctors,
      totalPatients,
      totalDepartments,
    ] = await Promise.all([
      this.prisma.appointment.count(),
      this.prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      this.prisma.appointment.count({
        where: { status: AppointmentStatus.PENDING },
      }),
      this.prisma.doctor.count({ where: { isActive: true } }),
      this.prisma.patient.count(),
      this.prisma.department.count(),
    ]);

    return {
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      totalDoctors,
      totalPatients,
      totalDepartments,
    };
  }
}
