import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('数据看板')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取看板统计数据' })
  getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('appointments-by-department')
  @ApiOperation({ summary: '各科室预约量统计' })
  getAppointmentsByDepartment() {
    return this.dashboardService.getAppointmentsByDepartment();
  }

  @Get('daily-trend')
  @ApiOperation({ summary: '每日预约趋势' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '天数，默认30天' })
  getDailyAppointmentTrend(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.dashboardService.getDailyAppointmentTrend(daysNum);
  }

  @Get('doctor-ranking')
  @ApiOperation({ summary: '医生好评率排行榜' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '数量，默认10' })
  getDoctorRatingRanking(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.dashboardService.getDoctorRatingRanking(limitNum);
  }

  @Get('status-distribution')
  @ApiOperation({ summary: '预约状态分布' })
  getAppointmentStatusDistribution() {
    return this.dashboardService.getAppointmentStatusDistribution();
  }
}
