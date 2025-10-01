import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsNumber, IsMimeType } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMediaDto {
  @ApiProperty({ description: 'ID пользователя, загрузившего файл' })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  uploaderId: number;

  @ApiProperty({ description: 'Имя файла' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Описание файла' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'MIME-тип файла' })
  @IsMimeType()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'Размер файла в байтах' })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  size: number;

  @ApiPropertyOptional({ description: 'Ширина изображения (для изображений)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  width?: number;

  @ApiPropertyOptional({ description: 'Высота изображения (для изображений)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ description: 'Длительность видео в секундах (для видео)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  duration?: number;
}
