import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalRecordService } from './medical-record.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('问诊记录')
@Controller('medical-records')
export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建问诊记录（医生）' })
  create(
    @Body() createMedicalRecordDto: CreateMedicalRecordDto,
    @CurrentUser() user: any,
  ) {
    return this.medicalRecordService.create(createMedicalRecordDto, user.id);
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的问诊记录（患者）' })
  async getMyRecords(@CurrentUser() user: any) {
    if (user.role === UserRole.PATIENT && user.patient) {
      return this.medicalRecordService.findByPatient(user.patient.id);
    }
    return [];
  }

  @Get('appointment/:appointmentId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据预约ID获取问诊记录' })
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.medicalRecordService.findByAppointment(+appointmentId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取问诊记录详情' })
  findOne(@Param('id') id: string) {
    return this.medicalRecordService.findOne(+id);
  }
}
