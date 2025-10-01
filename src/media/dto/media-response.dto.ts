import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MediaStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export class ThumbnailResponseDto {
  @ApiProperty({ description: 'Ширина миниатюры' })
  width: number;

  @ApiProperty({ description: 'Высота миниатюры' })
  height: number;

  @ApiProperty({ description: 'URL миниатюры' })
  url: string;

  @ApiProperty({ description: 'MIME-тип миниатюры' })
  mimeType: string;
}

export class MediaResponseDto {
  @ApiProperty({ description: 'Уникальный идентификатор медиафайла' })
  id: number;

  @ApiProperty({ description: 'ID пользователя, загрузившего файл' })
  uploaderId: number;

  @ApiProperty({ description: 'Имя файла' })
  name: string;

  @ApiPropertyOptional({ description: 'Описание файла' })
  description?: string | null;

  @ApiProperty({ description: 'MIME-тип файла' })
  mimeType: string;

  @ApiProperty({ description: 'Размер файла в байтах' })
  size: number;

  @ApiPropertyOptional({ description: 'Ширина изображения (для изображений)' })
  width?: number | null;

  @ApiPropertyOptional({ description: 'Высота изображения (для изображений)' })
  height?: number | null;

  @ApiPropertyOptional({ description: 'Длительность видео в секундах (для видео)' })
  duration?: number | null;

  @ApiProperty({ description: 'URL оригинального файла' })
  originalUrl: string;

  @ApiPropertyOptional({ type: [ThumbnailResponseDto], description: 'Массив миниатюр с URL и метаданными' })
  thumbnails?: ThumbnailResponseDto[] | null;

  @ApiProperty({ enum: MediaStatus, description: 'Статус обработки медиафайла' })
  status: MediaStatus;

  @ApiProperty({ description: 'Дата и время создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата и время последнего обновления записи' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Дата и время завершения обработки' })
  processedAt?: Date | null;
}
