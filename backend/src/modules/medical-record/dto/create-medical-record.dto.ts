import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsInt()
  @IsNotEmpty()
  appointmentId: number;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  prescription?: string;

  @IsString()
  @IsOptional()
  advice?: string;
}
