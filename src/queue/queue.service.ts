import { Injectable, Logger } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

interface QueueMessage {
  jobId: string;
  mediaId: number;
  objectKey: string;
  mimeType: string;
  requestedThumbnailSizes: { width: number; height: number }[];
  retryCount: number;
}

@Injectable()
export class QueueService {
  private readonly sqsClient: SQSClient;
  private readonly logger = new Logger(QueueService.name);
  private readonly queueUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const endpoint = this.configService.get<string>(
      'SQS_ENDPOINT',
      'http://localstack:4566',
    );
    const queueName = this.configService.get<string>(
      'SQS_QUEUE_NAME',
      'media-tasks',
    );
    this.queueUrl = `${endpoint}/000000000000/${queueName}`;

    this.sqsClient = new SQSClient({
      region: region,
      endpoint: endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>(
          'AWS_ACCESS_KEY_ID',
          'test',
        ),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          'test',
        ),
      },
    });
  }

  private makeDeduplicationId(input: string): string {
    // Хэшируем строку в sha256 и берем первые 128 символов
    return createHash('sha256').update(input).digest('hex').slice(0, 128);
  }

  async enqueue(message: QueueMessage): Promise<void> {
    const params = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    };

    try {
      await this.sqsClient.send(new SendMessageCommand(params));
      this.logger.log(`Message enqueued for mediaId: ${message.mediaId}`);
    } catch (error) {
      this.logger.error(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to enqueue message for mediaId ${message.mediaId}: ${error.message}`,
      );
      throw error;
    }
  }

  async pullMessages(
    maxNumberOfMessages: number = 10,
    visibilityTimeout: number = 30,
  ): Promise<any[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxNumberOfMessages,
      WaitTimeSeconds: 20, // Long polling
      VisibilityTimeout: visibilityTimeout,
    });

    try {
      const { Messages } = await this.sqsClient.send(command);
      if (Messages && Messages.length > 0) {
        this.logger.log(`Received ${Messages.length} messages from queue.`);
        return Messages.map((msg) => ({
          ...msg,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          Body: msg.Body ? JSON.parse(msg.Body) : undefined,
        }));
      }
      return [];
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`Failed to pull messages from queue: ${error.message}`);
      throw error;
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    try {
      await this.sqsClient.send(command);
      this.logger.log(`Message deleted with receipt handle: ${receiptHandle}`);
    } catch (error) {
      this.logger.error(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to delete message with receipt handle ${receiptHandle}: ${error.message}`,
      );
      throw error;
    }
  }
}
