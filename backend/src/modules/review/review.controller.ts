import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('评价管理')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建评价（患者）' })
  create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewService.create(createReviewDto, user.id);
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: '获取医生的评价列表' })
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.reviewService.findByDoctor(+doctorId);
  }

  @Get('appointment/:appointmentId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据预约ID获取评价' })
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.reviewService.findByAppointment(+appointmentId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取评价详情' })
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(+id);
  }
}
