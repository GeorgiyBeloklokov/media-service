import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

import { loadWorkerConfig } from './config/loader';
import { MediaProcessor } from './services/media-processor';
import { QueuePoller } from './services/queue-poller';
import { WorkerGracefulShutdown } from './graceful-shutdown';

const logger = pino({
  level: 'info',
  transport: {
    targets: [
      {
        target: 'pino-roll',
        level: 'info',
        options: {
          file: 'logs/worker.log',
          frequency: 'daily',
          size: '10m',
          mkdir: true,
          limit: { count: 7 },
        },
      },
      {
        target: 'pino-pretty',
        level: 'info',
        options: {
          colorize: true,
          singleLine: true,
        },
      },
    ],
  },
});

class Worker {
  private readonly prisma: PrismaClient;
  private readonly queuePoller: QueuePoller;
  private readonly gracefulShutdown: WorkerGracefulShutdown;

  constructor(private readonly logger: pino.Logger) {
    this.logger.info('Initializing worker...');
    this.prisma = new PrismaClient();
    const config = loadWorkerConfig();

    const s3Client = new S3Client({
      region: config.minio.region,
      endpoint: config.minio.endpoint,
      credentials: {
        accessKeyId: config.minio.rootUser,
        secretAccessKey: config.minio.rootPassword,
      },
      forcePathStyle: true,
    });

    const sqsClient = new SQSClient({
      region: config.sqs.region,
      endpoint: config.sqs.endpoint,
      credentials: {
        accessKeyId: config.sqs.accessKeyId,
        secretAccessKey: config.sqs.secretAccessKey,
      },
    });

    const sqsQueueUrl = `${config.sqs.endpoint}/000000000000/${config.sqs.queueName}`;

    const mediaProcessor = new MediaProcessor(
      this.prisma,
      s3Client,
      sqsClient,
      config.minio.bucket,
      sqsQueueUrl,
      config.imagorVideo.url,
      config.minio.endpoint,
      this.logger,
    );

    this.queuePoller = new QueuePoller(sqsClient, sqsQueueUrl, mediaProcessor, this.logger);

    this.gracefulShutdown = new WorkerGracefulShutdown(this.prisma, () => this.queuePoller.stopPolling());
  }

  async startPolling(): Promise<void> {
    await this.queuePoller.startPolling();
  }

  async onApplicationShutdown() {
    this.logger.info('Shutting down worker...');
    await this.prisma.$disconnect();
    this.logger.info('Prisma client disconnected.');
  }
}

const worker = new Worker(logger);

async function bootstrapWorker() {
  try {
    await worker.startPolling();
  } catch (error) {
    logger.error({ error: error as Error }, `Worker failed to start or encountered a critical error`);
    process.exit(1);
  }
}

bootstrapWorker().catch((error) => {
  logger.fatal({ error: error as Error }, 'Failed to bootstrap worker');
  process.exit(1);
});

// Signal handlers are now managed by WorkerGracefulShutdown
