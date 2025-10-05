import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DeleteMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, MediaStatus } from '@prisma/client';
import axios from 'axios';
import * as path from 'path';

import { WorkerQueueMessage, MediaRecord, ThumbnailData } from '../types';
import { fetchWithRetry } from '../utils/retry';

export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly s3Client: S3Client,
    private readonly sqsClient: SQSClient,
    private readonly bucketName: string,
    private readonly sqsQueueUrl: string,
    private readonly imagorVideoUrl: string,
    private readonly minioEndpoint: string,
  ) {}

  async processMessage(message: WorkerQueueMessage, receiptHandle: string): Promise<void> {
    const { mediaId, objectKey, requestedThumbnailSizes, jobId } = message;

    try {
      const existingMedia = (await this.prisma.media.findUnique({
        where: { id: mediaId },
      })) as MediaRecord | null;

      if (!existingMedia) {
        this.logger.warn(`Media with ID ${mediaId} not found. Skipping processing for jobId: ${jobId}`);
        await this.deleteMessage(receiptHandle);
        return;
      }

      if (existingMedia.status !== 'PENDING') {
        this.logger.warn(
          `Media ${mediaId} is already in status ${existingMedia.status}. Skipping processing for jobId: ${jobId}`,
        );
        await this.deleteMessage(receiptHandle);
        return;
      }

      await this.updateMediaStatus(mediaId, MediaStatus.PROCESSING);
      const thumbnails = await this.processThumbnails(mediaId, objectKey, requestedThumbnailSizes);
      await this.completeProcessing(mediaId, thumbnails);
      await this.deleteMessage(receiptHandle);

      this.logger.log(`SQS message deleted for mediaId: ${mediaId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process message for mediaId ${mediaId}: ${errorMessage}`);
      await this.updateMediaStatus(mediaId, MediaStatus.FAILED);
    }
  }

  private async updateMediaStatus(mediaId: number, status: MediaStatus): Promise<void> {
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { status },
    });
  }

  private async processThumbnails(
    mediaId: number,
    objectKey: string,
    requestedThumbnailSizes: { width: number; height: number }[],
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

    this.logger.log(`Original file downloaded: ${objectKey}`);

    const thumbnails: ThumbnailData[] = [];

    for (const { width, height } of requestedThumbnailSizes) {
      const thumbnailKey = `media/thumbnails/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${mediaId}-${width}x${height}${path.extname(objectKey)}`;

      const fullMinioUrl = `${this.minioEndpoint}/${this.bucketName}/${objectKey}`;
      const imagorVideoEndpoint = `${this.imagorVideoUrl}/unsafe/${width}x${height}/${fullMinioUrl}`;

      this.logger.log(`Generating thumbnail for ${objectKey} with ImagorVideo at: ${imagorVideoEndpoint}`);

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

      this.logger.log(`Thumbnail uploaded: ${thumbnailKey}`);

      thumbnails.push({
        url: thumbnailKey,
        width,
        height,
        mimeType: thumbnailMimeType,
      });
    }

    return thumbnails;
  }

  private async completeProcessing(mediaId: number, thumbnails: ThumbnailData[]): Promise<void> {
    await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        status: MediaStatus.READY,
        thumbnails: thumbnails as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });
    this.logger.log(`Media ${mediaId} processed and updated to READY.`);
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.sqsQueueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }
}
