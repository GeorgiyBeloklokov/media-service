import { IsOptional, IsInt, Min, Max, IsDateString, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MediaSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  SIZE = 'size',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class MediaFilterDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  size?: number = 10;

  @ApiPropertyOptional({
    enum: MediaSortBy,
    description: 'Sort field',
    default: MediaSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(MediaSortBy)
  sort?: MediaSortBy = MediaSortBy.CREATED_AT;

  @ApiPropertyOptional({
    enum: SortOrder,
    description: 'Sort order (asc/desc)',
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ description: 'File MIME type for filtering' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Filter media files uploaded after this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  uploadedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter media files uploaded before this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  uploadedBefore?: string;

  @ApiPropertyOptional({
    description: 'Search query for file name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
