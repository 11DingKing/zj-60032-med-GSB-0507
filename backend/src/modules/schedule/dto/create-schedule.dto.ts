import { IsInt, IsString, IsNotEmpty, Min, Max, IsOptional } from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(7)
  weekDay: number;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxAppointments?: number;
}
