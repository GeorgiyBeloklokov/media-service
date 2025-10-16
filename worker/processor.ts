import { Job, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';
import pino from 'pino';
import { MediaProcessor } from './services/media-processor';
import { loadWorkerConfig } from './config/loader';
import { MediaJobPayload } from './types';

const config = loadWorkerConfig();
const parentLogger = pino();

// Create clients once
const prisma = new PrismaClient();
const s3Client = new S3Client({
  region: config.minio.region,
  endpoint: config.minio.endpoint,
  credentials: {
    accessKeyId: config.minio.rootUser,
    secretAccessKey: config.minio.rootPassword,
  },
  forcePathStyle: true,
});

// Create a MediaProcessor instance
const mediaProcessor = new MediaProcessor(
  prisma,
  s3Client,
  config.minio.bucket,
  config.imagorVideo.url,
  config.minio.endpoint,
  parentLogger,
);

// Create a BullMQ worker
const worker = new Worker(
  'media',
  async (job: Job<MediaJobPayload>) => {
    const childLogger = parentLogger.child({ correlationId: job.data.correlationId, jobId: job.id });
    childLogger.info({ jobName: job.name, mediaId: job.data.mediaId }, 'Processing job');

    try {
      await mediaProcessor.processMessage(job.data, childLogger);
    } catch (error) {
      if (error instanceof Error) {
        childLogger.error({ err: error }, `Job processing failed: ${error.message}`);
      } else {
        childLogger.error({ err: error as Error }, 'Job processing failed with a non-error object.');
      }
      throw error; // Allow BullMQ to handle the error and retry
    }
  },
  {
    connection: {
      host: 'redis',
      port: 6379,
    },
    concurrency: config.concurrency,
    limiter: {
      max: 10,
      duration: 5000,
    },
  },
);

parentLogger.info('Worker started and waiting for jobs...');

export const bullWorker = worker;
export const prismaClient = prisma;
