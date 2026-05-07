import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AppointmentStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('预约管理')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建预约（患者）' })
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser() user: any,
  ) {
    return this.appointmentService.create(createAppointmentDto, user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有预约（管理员）' })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  findAll(@Query('status') status?: AppointmentStatus) {
    return this.appointmentService.findAll(status);
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的预约列表' })
  async getMyAppointments(@CurrentUser() user: any) {
    if (user.role === UserRole.PATIENT && user.patient) {
      return this.appointmentService.findByPatient(user.patient.id);
    }
    if (user.role === UserRole.DOCTOR && user.doctor) {
      return this.appointmentService.findByDoctor(user.doctor.id);
    }
    return [];
  }

  @Get('doctor/:doctorId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取医生的预约列表' })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  findByDoctor(
    @Param('doctorId') doctorId: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointmentService.findByDoctor(+doctorId, status);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取预约详情' })
  findOne(@Param('id') id: string) {
    return this.appointmentService.findOne(+id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新预约状态' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateAppointmentStatusDto: UpdateAppointmentStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.appointmentService.updateStatus(
      +id,
      updateAppointmentStatusDto,
      user.id,
      user.role,
    );
  }
}
