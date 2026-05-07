import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CopyScheduleDto } from './dto/copy-schedule.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('排班管理')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建排班（医生/管理员）' })
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.scheduleService.create(createScheduleDto);
  }

  @Post('batch')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量设置排班（医生/管理员）' })
  batchCreate(
    @Body('doctorId') doctorId: number,
    @Body('schedules') schedules: CreateScheduleDto[],
  ) {
    return this.scheduleService.batchCreate(doctorId, schedules);
  }

  @Post('copy-to-next-week')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '复制排挡到下一周（医生/管理员）' })
  copyToNextWeek(@Body() copyScheduleDto: CopyScheduleDto) {
    return this.scheduleService.copyToNextWeek(copyScheduleDto);
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: '获取医生的排班列表' })
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.scheduleService.findByDoctor(+doctorId);
  }

  @Get('available/:doctorId')
  @ApiOperation({ summary: '获取医生指定日期的可预约时段' })
  @ApiQuery({ name: 'date', required: true, type: String, description: '日期格式：YYYY-MM-DD' })
  getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.scheduleService.getAvailableSlots(+doctorId, date);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除排班（医生/管理员）' })
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(+id);
  }
}
