import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class DoctorService {
  private readonly HOT_DOCTORS_CACHE_KEY = 'hot:doctors';
  private readonly CACHE_TTL = 300;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createDoctorDto: CreateDoctorDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createDoctorDto.username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: createDoctorDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('科室不存在');
    }

    const hashedPassword = await bcrypt.hash(createDoctorDto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: createDoctorDto.username,
          password: hashedPassword,
          realName: createDoctorDto.realName,
          phone: createDoctorDto.phone,
          avatar: createDoctorDto.avatar,
          role: UserRole.DOCTOR,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          departmentId: createDoctorDto.departmentId,
          title: createDoctorDto.title,
          specialty: createDoctorDto.specialty,
          introduction: createDoctorDto.introduction,
          avatar: createDoctorDto.avatar,
          isActive: createDoctorDto.isActive ?? true,
        },
      });

      return doctor;
    });
  }

  async findAll(departmentId?: number) {
    const where: any = { isActive: true };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    return this.prisma.doctor.findMany({
      where,
      include: {
        department: true,
        user: {
          select: { realName: true, phone: true, avatar: true },
        },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async getHotDoctors(limit: number = 6) {
    const cached = await this.redisService.getJson<any[]>(this.HOT_DOCTORS_CACHE_KEY);
    if (cached) {
      return cached.slice(0, limit);
    }

    const doctors = await this.prisma.doctor.findMany({
      where: { isActive: true, reviewCount: { gt: 0 } },
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

    await this.redisService.setJson(this.HOT_DOCTORS_CACHE_KEY, doctors, this.CACHE_TTL);
    return doctors;
  }

  async getTodayAvailableDoctors() {
    const today = new Date();
    const weekDay = today.getDay();
    const adjustedWeekDay = weekDay === 0 ? 7 : weekDay;

    const schedules = await this.prisma.schedule.findMany({
      where: { weekDay: adjustedWeekDay },
      include: {
        doctor: {
          include: {
            department: true,
            user: {
              select: { realName: true, avatar: true },
            },
          },
        },
      },
    });

    const doctorMap = new Map();
    for (const schedule of schedules) {
      if (!doctorMap.has(schedule.doctorId) && schedule.doctor.isActive) {
        doctorMap.set(schedule.doctorId, schedule.doctor);
      }
    }

    return Array.from(doctorMap.values());
  }

  async findOne(id: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        department: true,
        user: {
          select: { realName: true, phone: true, email: true, avatar: true },
        },
        reviews: {
          include: {
            patient: {
              include: {
                user: {
                  select: { realName: true, avatar: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('医生不存在');
    }

    return doctor;
  }

  async update(id: number, updateDoctorDto: UpdateDoctorDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!doctor) {
      throw new NotFoundException('医生不存在');
    }

    if (updateDoctorDto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: updateDoctorDto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('科室不存在');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const userUpdateData: any = {};
      if (updateDoctorDto.realName) userUpdateData.realName = updateDoctorDto.realName;
      if (updateDoctorDto.phone) userUpdateData.phone = updateDoctorDto.phone;
      if (updateDoctorDto.avatar) userUpdateData.avatar = updateDoctorDto.avatar;
      if (updateDoctorDto.password) {
        userUpdateData.password = await bcrypt.hash(updateDoctorDto.password, 10);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: userUpdateData,
        });
      }

      const doctorUpdateData: any = {};
      if (updateDoctorDto.departmentId) doctorUpdateData.departmentId = updateDoctorDto.departmentId;
      if (updateDoctorDto.title) doctorUpdateData.title = updateDoctorDto.title;
      if (updateDoctorDto.specialty) doctorUpdateData.specialty = updateDoctorDto.specialty;
      if (updateDoctorDto.introduction) doctorUpdateData.introduction = updateDoctorDto.introduction;
      if (updateDoctorDto.avatar) doctorUpdateData.avatar = updateDoctorDto.avatar;
      if (updateDoctorDto.isActive !== undefined) doctorUpdateData.isActive = updateDoctorDto.isActive;

      if (Object.keys(doctorUpdateData).length > 0) {
        await tx.doctor.update({
          where: { id },
          data: doctorUpdateData,
        });
      }

      await this.redisService.del(this.HOT_DOCTORS_CACHE_KEY);

      return this.findOne(id);
    });
  }

  async remove(id: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { appointments: true },
    });

    if (!doctor) {
      throw new NotFoundException('医生不存在');
    }

    if (doctor.appointments.length > 0) {
      throw new ConflictException('该医生还有预约记录，无法删除');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.doctor.delete({ where: { id } });
      await tx.user.delete({ where: { id: doctor.userId } });
      await this.redisService.del(this.HOT_DOCTORS_CACHE_KEY);
      return { message: '删除成功' };
    });
  }
}
