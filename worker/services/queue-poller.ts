import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import pino from 'pino';

import { WorkerQueueMessage } from '../types';
import { WORKER_DEFAULTS } from '../config/defaults';
import { MediaProcessor } from './media-processor';

export class QueuePoller {
  private isPolling = false;

  constructor(
    private readonly sqsClient: SQSClient,
    private readonly sqsQueueUrl: string,
    private readonly mediaProcessor: MediaProcessor,
    private readonly logger: pino.Logger,
  ) {
    this.logger.info('QueuePoller initialized');
  }

  async startPolling(): Promise<void> {
    this.logger.info('Worker polling started...');
    this.isPolling = true;

    try {
      while (this.isPolling) {
        try {
          await this.pollOnce();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Error during polling: ${errorMessage}`);
        }

        if (this.isPolling) {
          await this.sleep(WORKER_DEFAULTS.polling.intervalSeconds * 1000);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unhandled error in startPolling: ${errorMessage}. Exiting worker.`);
      process.exit(1);
    }
  }

  stopPolling(): void {
    this.logger.info('Stopping polling...');
    this.isPolling = false;
  }

  private async pollOnce(): Promise<void> {
    const { Messages } = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: this.sqsQueueUrl,
        MaxNumberOfMessages: WORKER_DEFAULTS.polling.maxMessages,
        WaitTimeSeconds: WORKER_DEFAULTS.polling.waitTimeSeconds,
        VisibilityTimeout: WORKER_DEFAULTS.polling.visibilityTimeoutSeconds,
      }),
    );

    if (Messages && Messages.length > 0) {
      for (const message of Messages) {
        if (!message.Body || !message.ReceiptHandle) {
          this.logger.warn('Received message with empty Body or ReceiptHandle. Skipping.');
          continue;
        }

        const body = JSON.parse(message.Body) as WorkerQueueMessage;
        const childLogger = this.logger.child({ correlationId: body.correlationId });

        childLogger.info(`Processing message for mediaId: ${body.mediaId}, jobId: ${body.jobId}`);

        await this.mediaProcessor.processMessage(body, message.ReceiptHandle, childLogger);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
