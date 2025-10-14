import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as path from 'path';
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

@Injectable()
export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(private readonly config: MediaConfig) {}

  generateObjectKey(originalname: string): string {
    const fileExtension = path.extname(originalname);
    const now = new Date();
    return `originals/${now.getFullYear()}/${now.getMonth() + 1}/${uuidv4()}${fileExtension}`;
  }

  buildMediaCreateData(createMediaDto: CreateMediaDto, objectKey: string): Prisma.MediaCreateInput {
    return {
      uploaderId: Number(createMediaDto.uploaderId),
      name: createMediaDto.name,
      description: createMediaDto.description,
      mimeType: createMediaDto.mimeType,
      size: Number(createMediaDto.size),
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
