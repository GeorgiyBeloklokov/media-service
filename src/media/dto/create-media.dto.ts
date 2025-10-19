import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsMimeType } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Trim, Escape } from 'class-sanitizer';

export class CreateMediaDto {
  @ApiProperty({ description: 'ID of the user who uploaded the file' })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  uploaderId: number;

  @ApiPropertyOptional({ description: 'File name' })
  @IsOptional()
  @IsString()
  @Trim()
  @Escape()
  name?: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  @Trim()
  @Escape()
  description?: string;

  @ApiPropertyOptional({ description: 'File MIME type' })
  @IsOptional()
  @IsMimeType()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  size?: number;

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
