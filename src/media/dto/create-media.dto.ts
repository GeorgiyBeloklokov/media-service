import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsMimeType } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMediaDto {
  @ApiProperty({ description: 'ID of the user who uploaded the file' })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  uploaderId: number;

  @ApiProperty({ description: 'File name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'File MIME type' })
  @IsMimeType()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  size: number;

  @ApiPropertyOptional({ description: 'Image width (for images)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  width?: number;

  @ApiPropertyOptional({ description: 'Image height (for images)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({
    description: 'Video duration in seconds (for videos)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  duration?: number;
}
