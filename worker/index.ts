import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosRequestConfig } from 'axios';
import sharp from 'sharp';

interface WorkerQueueMessage {
  jobId: string;
  mediaId: number;
  objectKey: string;
  mimeType: string;
  requestedThumbnailSizes: { width: number; height: number }[];
  retryCount: number;
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

class Worker {
  private readonly prisma: PrismaClient;
  private readonly s3Client: S3Client;
  private readonly sqsClient: SQSClient;
  private readonly logger = new Logger(Worker.name);

  private readonly bucketName: string;
  private readonly region: string;
  private readonly sqsQueueUrl: string;
  private readonly imagorVideoUrl: string;
  private readonly minioEndpoint: string;
  private readonly minioRootUser: string;
  private readonly minioRootPassword: string;

  constructor() {
    this.prisma = new PrismaClient();
    
    this.region = process.env.MINIO_REGION || 'us-east-1';
    this.bucketName = process.env.MINIO_BUCKET || 'media';
    this.minioEndpoint = process.env.MINIO_ENDPOINT || 'http://minio:9000';
    this.minioRootUser = process.env.MINIO_ROOT_USER || 'minioadmin';
    this.minioRootPassword = process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.minioEndpoint,
      credentials: {
        accessKeyId: this.minioRootUser,
        secretAccessKey: this.minioRootPassword,
      },
      forcePathStyle: true,
    });

    const queueName = process.env.SQS_QUEUE_NAME || 'media-tasks';
    this.sqsQueueUrl = `http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/${queueName}`;
    this.imagorVideoUrl = process.env.IMAGORVIDEO_URL || 'http://imagorvideo:8080';

    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.SQS_ENDPOINT || 'http://localstack:4566',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });
  }

  async startPolling() {
    this.logger.log('Worker polling started...');
    try {
      while (true) {
        try {
          const { Messages } = await this.sqsClient.send(new ReceiveMessageCommand({
            QueueUrl: this.sqsQueueUrl,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 10,
            VisibilityTimeout: 300, // 5 minutes
          }));

          if (Messages && Messages.length > 0) {
            for (const message of Messages) {
              if (!message.Body || !message.ReceiptHandle) {
                this.logger.warn('Received message with empty Body or ReceiptHandle. Skipping.');
                continue;
              }
              const body: WorkerQueueMessage = JSON.parse(message.Body);
              this.logger.log(`Processing message for mediaId: ${body.mediaId}, jobId: ${body.jobId}`);
              await this.processMessage(body, message.ReceiptHandle);
            }
          }
        } catch (error) {
          this.logger.error(`Error during polling: ${error.message}`);
          // If an error occurs during polling, we should log it and allow the loop to continue
          // However, if the error is persistent, the container should ideally restart to clear state.
          // For now, we'll log and continue. If the error is critical, restart policy of docker-compose will handle it.
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      }
    } catch (error) {
      this.logger.error(`Unhandled error in startPolling: ${error.message}. Exiting worker.`);
      // Exit with a non-zero code so Docker Compose can restart the container if restart policy is set.
      process.exit(1);
    }
  }

  private async processMessage(message: WorkerQueueMessage, receiptHandle: string) {
    const { mediaId, objectKey, mimeType, requestedThumbnailSizes, jobId } = message;

    try {
      const existingMedia = await this.prisma.media.findUnique({
        where: { id: mediaId },
      });

      if (!existingMedia) {
        this.logger.warn(`Media with ID ${mediaId} not found. Skipping processing for jobId: ${jobId}`);
        await this.sqsClient.send(new DeleteMessageCommand({
          QueueUrl: this.sqsQueueUrl,
          ReceiptHandle: receiptHandle,
        }));
        return;
      }

      if (existingMedia.status !== 'PENDING') {
        this.logger.warn(`Media ${mediaId} is already in status ${existingMedia.status}. Skipping processing for jobId: ${jobId}`);
        await this.sqsClient.send(new DeleteMessageCommand({
          QueueUrl: this.sqsQueueUrl,
          ReceiptHandle: receiptHandle,
        }));
        return;
      }

      // Update media status to PROCESSING
      await this.prisma.media.update({
        where: { id: mediaId },
        data: { status: 'PROCESSING' },
      });

      // Download original file from MinIO
      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });
      const response = await fetchWithRetry(() => this.s3Client.send(getObjectCommand));
      if (!response.Body) {
        throw new Error(`File body is empty for key: ${objectKey}`);
      }
      const originalFileBuffer = Buffer.from(await response.Body.transformToByteArray());
      this.logger.log(`Original file downloaded: ${objectKey}`);

      const thumbnails: { url: string; width: number; height: number; mimeType: string }[] = [];

      for (const { width, height } of requestedThumbnailSizes) {
        const thumbnailKey = `media/thumbnails/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${mediaId}-${width}x${height}${path.extname(objectKey)}`;
        const imageUrl = `${this.minioEndpoint}/${this.bucketName}/${objectKey}`;
        const imagorVideoEndpoint = `${this.imagorVideoUrl}/unsafe/${width}x${height}/${imageUrl}`;
        
        this.logger.log(`Generating thumbnail for ${objectKey} with ImagorVideo: ${imagorVideoEndpoint}`);

        const thumbnailResponse = await fetchWithRetry(() => axios.get(imagorVideoEndpoint, {
          responseType: 'arraybuffer',
        }));

        const thumbnailBuffer = Buffer.from(thumbnailResponse.data);
        const thumbnailMimeType = thumbnailResponse.headers['content-type'];

        await fetchWithRetry(() => this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: thumbnailMimeType,
        })));
        this.logger.log(`Thumbnail uploaded: ${thumbnailKey}`);

        thumbnails.push({
          url: thumbnailKey,
          width,
          height,
          mimeType: thumbnailMimeType,
        });
      }

      // Update media status to READY and save thumbnails
      await this.prisma.media.update({
        where: { id: mediaId },
        data: { status: 'READY', thumbnails: thumbnails, processedAt: new Date() },
      });
      this.logger.log(`Media ${mediaId} processed and updated to READY.`);

      // Delete message from SQS
      await this.sqsClient.send(new DeleteMessageCommand({
        QueueUrl: this.sqsQueueUrl,
        ReceiptHandle: receiptHandle,
      }));
      this.logger.log(`SQS message deleted for mediaId: ${mediaId}`);

    } catch (error) {
      this.logger.error(`Failed to process message for mediaId ${mediaId}: ${error.message}`);
      await this.prisma.media.update({
        where: { id: mediaId },
        data: { status: 'FAILED' },
      });
      // TODO: Implement retry logic and move to DLQ if max retries exceeded
    }
  }

  async onApplicationShutdown() {
    this.logger.log('Shutting down worker...');
    await this.prisma.$disconnect();
    this.logger.log('Prisma client disconnected.');
  }
}

const worker = new Worker();

async function bootstrapWorker() {
  try {
    await worker.startPolling();
  } catch (error) {
    new Logger('WorkerBootstrap').error(`Worker failed to start or encountered a critical error: ${error.message}`);
    process.exit(1);
  }
}

bootstrapWorker();

process.on('SIGTERM', async () => {
  await worker.onApplicationShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.onApplicationShutdown();
  process.exit(0);
});
