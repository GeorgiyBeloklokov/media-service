import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('MINIO_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'media');
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'http://minio:9000');

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ROOT_USER', 'minioadmin'),
        secretAccessKey: this.configService.get<string>('MINIO_ROOT_PASSWORD', 'minioadmin'),
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key}`);
      return `s3://${this.bucketName}/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}: ${(error as Error).message}`);
      throw error;
    }
  }

  async uploadStream(key: string, stream: Readable, mimeType: string): Promise<string> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: stream,
        ContentType: mimeType,
      },
    });

    try {
      await upload.done();
      this.logger.log(`File uploaded successfully via stream: ${key}`);
      return `s3://${this.bucketName}/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file ${key} via stream: ${(error as Error).message}`);
      throw error;
    }
  }

  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      this.logger.log(`File retrieved successfully: ${key}`);
      if (!response.Body) {
        throw new NotFoundException(`File body is empty for key: ${key}`);
      }
      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      this.logger.error(`Failed to retrieve file ${key}: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}: ${(error as Error).message}`);
      throw error;
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Presigned URL generated for ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${key}: ${(error as Error).message}`);
      throw error;
    }
  }

  async checkConnection(): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: 'health-check-dummy',
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      // Expected error for non-existent key, but connection works
      if ((error as Error).name === 'NoSuchKey') {
        return;
      }
      throw error;
    }
  }
}
