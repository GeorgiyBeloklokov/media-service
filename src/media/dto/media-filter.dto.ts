import { IsOptional, IsInt, Min, Max, IsDateString, IsEnum, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MediaSortBy {
  CREATED_AT_DESC = 'createdAt_desc',
  CREATED_AT_ASC = 'createdAt_asc',
}

export class MediaFilterDto {
  @ApiPropertyOptional({ description: 'Номер страницы для пагинации', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Количество элементов на странице', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  size?: number = 10;

  @ApiPropertyOptional({ enum: MediaSortBy, description: 'Поле и порядок сортировки', default: MediaSortBy.CREATED_AT_DESC })
  @IsOptional()
  @IsEnum(MediaSortBy)
  sort?: MediaSortBy = MediaSortBy.CREATED_AT_DESC;

  @ApiPropertyOptional({ description: 'MIME-тип файла для фильтрации' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Фильтровать медиафайлы, загруженные после этой даты (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  uploadedAfter?: string;

  @ApiPropertyOptional({ description: 'Фильтровать медиафайлы, загруженные до этой даты (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  uploadedBefore?: string;

  @ApiPropertyOptional({ description: 'Поисковый запрос по имени или описанию файла' })
  @IsOptional()
  @IsString()
  search?: string;
}
