import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { loadWorkerConfig } from './config/loader';
import { MediaProcessor } from './services/media-processor';
import { QueuePoller } from './services/queue-poller';
import { WorkerGracefulShutdown } from './graceful-shutdown';

class Worker {
  private readonly prisma: PrismaClient;
  private readonly queuePoller: QueuePoller;
  private readonly gracefulShutdown: WorkerGracefulShutdown;
  private readonly logger = new Logger(Worker.name);

  constructor() {
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

    const sqsQueueUrl = `http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/${config.sqs.queueName}`;

    const mediaProcessor = new MediaProcessor(
      this.prisma,
      s3Client,
      sqsClient,
      config.minio.bucket,
      sqsQueueUrl,
      config.imagorVideo.url,
      config.minio.endpoint,
    );

    this.queuePoller = new QueuePoller(sqsClient, sqsQueueUrl, mediaProcessor);

    this.gracefulShutdown = new WorkerGracefulShutdown(this.prisma, () => this.queuePoller.stopPolling());
  }

  async startPolling(): Promise<void> {
    await this.queuePoller.startPolling();
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
    new Logger('WorkerBootstrap').error(
      `Worker failed to start or encountered a critical error: ${(error as Error).message}`,
    );
    process.exit(1);
  }
}

bootstrapWorker().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});

// Signal handlers are now managed by WorkerGracefulShutdown
