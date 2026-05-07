import { IsInt, IsNotEmpty, IsArray } from 'class-validator';

export class CopyScheduleDto {
  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @IsArray()
  @IsNotEmpty()
  sourceWeekDays: number[];
}
