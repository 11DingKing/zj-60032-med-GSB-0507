import { IsInt, IsString, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @IsNotEmpty()
  appointmentId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
