import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MediaStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export class ThumbnailResponseDto {
  @ApiProperty({ description: 'Thumbnail width' })
  width: number;

  @ApiProperty({ description: 'Thumbnail height' })
  height: number;

  @ApiProperty({ description: 'Thumbnail URL' })
  url: string;

  @ApiProperty({ description: 'Thumbnail MIME type' })
  mimeType: string;
}

export class MediaResponseDto {
  @ApiProperty({ description: 'Unique media file identifier' })
  id: number;

  @ApiProperty({ description: 'ID of the user who uploaded the file' })
  uploaderId: number;

  @ApiProperty({ description: 'File name' })
  name: string;

  @ApiPropertyOptional({ description: 'File description' })
  description?: string | null;

  @ApiProperty({ description: 'File MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiPropertyOptional({ description: 'Image width (for images)' })
  width?: number | null;

  @ApiPropertyOptional({ description: 'Image height (for images)' })
  height?: number | null;

  @ApiPropertyOptional({
    description: 'Video duration in seconds (for videos)',
  })
  duration?: number | null;

  @ApiProperty({ description: 'Original file URL' })
  originalUrl: string;

  @ApiPropertyOptional({
    type: [ThumbnailResponseDto],
    description: 'Array of thumbnails with URLs and metadata',
  })
  thumbnails?: ThumbnailResponseDto[] | null;

  @ApiProperty({
    enum: MediaStatus,
    description: 'Media file processing status',
  })
  status: MediaStatus;

  @ApiProperty({ description: 'Record creation date and time' })
  createdAt: Date;

  @ApiProperty({ description: 'Record last update date and time' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Processing completion date and time' })
  processedAt?: Date | null;
}
