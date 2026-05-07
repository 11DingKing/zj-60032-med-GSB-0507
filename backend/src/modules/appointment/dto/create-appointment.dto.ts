import { IsInt, IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  symptoms?: string;

  @IsInt()
  @IsOptional()
  scheduleId?: number;
}
