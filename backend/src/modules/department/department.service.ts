import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { name: createDepartmentDto.name },
    });

    if (existing) {
      throw new ConflictException('科室名称已存在');
    }

    return this.prisma.department.create({
      data: createDepartmentDto,
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { doctors: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        doctors: {
          include: {
            user: {
              select: { realName: true, avatar: true },
            },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('科室不存在');
    }

    return department;
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('科室不存在');
    }

    if (updateDepartmentDto.name && updateDepartmentDto.name !== department.name) {
      const existing = await this.prisma.department.findUnique({
        where: { name: updateDepartmentDto.name },
      });

      if (existing) {
        throw new ConflictException('科室名称已存在');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
    });
  }

  async remove(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { doctors: true },
    });

    if (!department) {
      throw new NotFoundException('科室不存在');
    }

    if (department.doctors.length > 0) {
      throw new ConflictException('该科室下还有医生，无法删除');
    }

    return this.prisma.department.delete({
      where: { id },
    });
  }
}
