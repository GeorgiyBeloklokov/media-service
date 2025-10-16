import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma, PrismaClient, MediaStatus } from '@prisma/client';
import axios from 'axios';
import pino from 'pino';
import * as path from 'path';

import { MediaJobPayload, MediaRecord, ThumbnailData } from '../types';
import { fetchWithRetry } from '../utils/retry';

export class MediaProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly s3Client: S3Client,
    private readonly bucketName: string,
    private readonly imagorVideoUrl: string,
    private readonly minioEndpoint: string,
    private readonly logger: pino.Logger,
  ) {
    this.logger.info('MediaProcessor initialized');
  }

  async processMessage(message: MediaJobPayload, logger: pino.Logger): Promise<void> {
    const { mediaId, objectKey, requestedThumbnailSizes } = message;

    try {
      const existingMedia = (await this.prisma.media.findUnique({
        where: { id: mediaId },
      })) as MediaRecord | null;

      if (!existingMedia) {
        logger.warn(`Media with ID ${mediaId} not found. Skipping processing.`);
        return;
      }

      // This check might be redundant if the job is only created once,
      // but it's a good safeguard.
      if (existingMedia.status !== 'PENDING') {
        logger.warn(`Media ${mediaId} is already in status ${existingMedia.status}. Skipping processing.`);
        return;
      }

      await this.updateMediaStatus(mediaId, MediaStatus.PROCESSING, logger);
      const thumbnails = await this.processThumbnails(mediaId, objectKey, requestedThumbnailSizes, logger);
      await this.completeProcessing(mediaId, thumbnails, logger);

      logger.info(`Job completed for mediaId: ${mediaId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to process message for mediaId ${mediaId}: ${errorMessage}`);
      await this.updateMediaStatus(mediaId, MediaStatus.FAILED, logger);
      throw error; // Important to re-throw for BullMQ retries
    }
  }

  private async updateMediaStatus(mediaId: number, status: MediaStatus, logger: pino.Logger): Promise<void> {
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { status },
    });
    logger.info(`Updated media status to ${status} for mediaId: ${mediaId}`);
  }

  private async processThumbnails(
    mediaId: number,
    objectKey: string,
    requestedThumbnailSizes: { width: number; height: number }[],
    logger: pino.Logger,
  ): Promise<ThumbnailData[]> {
    // Download original file from MinIO
    const getObjectCommand = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });
    const response = await fetchWithRetry(() => this.s3Client.send(getObjectCommand));

    if (!response.Body) {
      throw new Error(`File body is empty for key: ${objectKey}`);
    }

    logger.info(`Original file downloaded: ${objectKey}`);

    const thumbnails: ThumbnailData[] = [];

    for (const { width, height } of requestedThumbnailSizes) {
      const thumbnailKey = `media/thumbnails/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${mediaId}-${width}x${height}${path.extname(objectKey)}`;

      const fullMinioUrl = `${this.minioEndpoint}/${this.bucketName}/${objectKey}`;
      const imagorVideoEndpoint = `${this.imagorVideoUrl}/unsafe/${width}x${height}/${fullMinioUrl}`;

      logger.info(`Generating thumbnail for ${objectKey} with ImagorVideo at: ${imagorVideoEndpoint}`);

      const thumbnailResponse = await fetchWithRetry(() =>
        axios.get(imagorVideoEndpoint, { responseType: 'arraybuffer' }),
      );

      const thumbnailBuffer = Buffer.from(thumbnailResponse.data as ArrayBuffer);
      const thumbnailMimeType = thumbnailResponse.headers['content-type'] as string;

      await fetchWithRetry(() =>
        this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: thumbnailMimeType,
          }),
        ),
      );

      logger.info(`Thumbnail uploaded: ${thumbnailKey}`);

      thumbnails.push({
        url: thumbnailKey,
        width,
        height,
        mimeType: thumbnailMimeType,
      });
    }

    return thumbnails;
  }

  private async completeProcessing(mediaId: number, thumbnails: ThumbnailData[], logger: pino.Logger): Promise<void> {
    await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        status: MediaStatus.READY,
        thumbnails: thumbnails as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });
    logger.info(`Media ${mediaId} processed and updated to READY.`);
  }
}
