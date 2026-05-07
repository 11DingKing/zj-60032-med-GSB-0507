import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DoctorService } from './doctor.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('医生管理')
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建医生（管理员）' })
  create(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorService.create(createDoctorDto);
  }

  @Get()
  @ApiOperation({ summary: '获取医生列表' })
  @ApiQuery({ name: 'departmentId', required: false, type: Number })
  findAll(@Query('departmentId') departmentId?: string) {
    return this.doctorService.findAll(departmentId ? +departmentId : undefined);
  }

  @Get('hot')
  @ApiOperation({ summary: '获取热门医生（按评分排序Top6）' })
  getHotDoctors() {
    return this.doctorService.getHotDoctors(6);
  }

  @Get('today-available')
  @ApiOperation({ summary: '获取今日可预约医生' })
  getTodayAvailable() {
    return this.doctorService.getTodayAvailableDoctors();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取医生详情' })
  findOne(@Param('id') id: string) {
    return this.doctorService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新医生信息（管理员）' })
  update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorService.update(+id, updateDoctorDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除医生（管理员）' })
  remove(@Param('id') id: string) {
    return this.doctorService.remove(+id);
  }
}
