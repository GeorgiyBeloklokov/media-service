export interface MediaJobPayload {
  correlationId: string;
  mediaId: number;
  objectKey: string;
  mimeType: string;
  requestedThumbnailSizes: ThumbnailSize[];
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
