export interface WorkerQueueMessage {
  jobId: string;
  mediaId: number;
  objectKey: string;
  mimeType: string;
  requestedThumbnailSizes: ThumbnailSize[];
  retryCount: number;
}

export interface MediaRecord {
  id: number;
  status: string;
  uploaderId: number;
  name: string;
  description?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  originalUrl: string;
  thumbnails?: unknown;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface ThumbnailData {
  url: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface ThumbnailSize {
  width: number;
  height: number;
}

export interface WorkerConfig {
  minio: {
    region: string;
    bucket: string;
    endpoint: string;
    rootUser: string;
    rootPassword: string;
  };
  sqs: {
    region: string;
    endpoint: string;
    queueName: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  imagorVideo: {
    url: string;
  };
  polling: {
    maxMessages: number;
    waitTimeSeconds: number;
    visibilityTimeoutSeconds: number;
    intervalSeconds: number;
  };
}
