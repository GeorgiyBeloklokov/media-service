import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';

import { WorkerQueueMessage } from '../types';
import { WORKER_DEFAULTS } from '../config/defaults';
import { MediaProcessor } from './media-processor';

export class QueuePoller {
  private readonly logger = new Logger(QueuePoller.name);

  constructor(
    private readonly sqsClient: SQSClient,
    private readonly sqsQueueUrl: string,
    private readonly mediaProcessor: MediaProcessor,
  ) {}

  async startPolling(): Promise<void> {
    this.logger.log('Worker polling started...');

    try {
      while (true) {
        try {
          await this.pollOnce();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Error during polling: ${errorMessage}`);
        }

        await this.sleep(WORKER_DEFAULTS.polling.intervalSeconds * 1000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unhandled error in startPolling: ${errorMessage}. Exiting worker.`);
      process.exit(1);
    }
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
        this.logger.log(`Processing message for mediaId: ${body.mediaId}, jobId: ${body.jobId}`);

        await this.mediaProcessor.processMessage(body, message.ReceiptHandle);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
