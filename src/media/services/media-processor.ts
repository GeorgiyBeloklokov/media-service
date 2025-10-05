import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { MediaConfig, ThumbnailSize } from '../config/media-config';
import { CreateMediaDto } from '../dto/create-media.dto';
import { MediaStatus } from '../dto/media-response.dto';

interface QueueMessage {
  jobId: string;
  mediaId: number;
  objectKey: string;
  mimeType: string;
  requestedThumbnailSizes: ThumbnailSize[];
  retryCount: number;
}

export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(private readonly config: MediaConfig) {}

  generateObjectKey(originalname: string): string {
    const fileExtension = path.extname(originalname);
    const now = new Date();
    return `originals/${now.getFullYear()}/${now.getMonth() + 1}/${uuidv4()}${fileExtension}`;
  }

  async extractImageDimensions(
    file: Express.Multer.File,
    createMediaDto: CreateMediaDto,
  ): Promise<{ width?: number; height?: number }> {
    const { mimeType, width, height } = createMediaDto;

    if (!mimeType.startsWith('image/') || width || height) {
      return { width, height };
    }

    try {
      const metadata = await sharp(file.buffer).metadata();
      return { width: metadata.width, height: metadata.height };
    } catch (error) {
      this.logger.warn(
        `Could not get image metadata for ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { width, height };
    }
  }

  buildMediaCreateData(
    createMediaDto: CreateMediaDto,
    objectKey: string,
    width?: number,
    height?: number,
  ): Prisma.MediaCreateInput {
    return {
      uploaderId: Number(createMediaDto.uploaderId),
      name: createMediaDto.name,
      description: createMediaDto.description,
      mimeType: createMediaDto.mimeType,
      size: Number(createMediaDto.size),
      width,
      height,
      duration: createMediaDto.duration,
      originalUrl: objectKey,
      status: MediaStatus.PENDING,
    };
  }

  buildQueueMessage(mediaId: number, objectKey: string, mimeType: string): QueueMessage {
    return {
      jobId: uuidv4(),
      mediaId,
      objectKey,
      mimeType,
      requestedThumbnailSizes: this.config.thumbnailSizes,
      retryCount: 0,
    };
  }
}
