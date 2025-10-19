import { BadRequestException, Injectable } from '@nestjs/common';
import { MediaConfig } from '../config/media-config';
import sharp from 'sharp';
import { Readable } from 'stream';

@Injectable()
export class FileValidator {
  constructor(private readonly config: MediaConfig) {}

  async validate(stream: Readable, mimeType: string): Promise<{ stream: Readable; size: number }> {
    const sharpInstance = sharp();
    stream.pipe(sharpInstance);

    let size = 0;
    stream.on('data', (chunk) => (size += chunk.length));

    try {
      const metadata = await sharpInstance.metadata();
      const originalMimeType = metadata.format ? `image/${metadata.format}` : undefined;

      if (!originalMimeType || originalMimeType !== mimeType) {
        throw new BadRequestException('Invalid file type');
      }

      if (mimeType.startsWith('image/')) {
        this.validateImage(size, metadata.width, metadata.height);
      } else if (mimeType.startsWith('video/')) {
        this.validateVideo(size);
      } else {
        throw new BadRequestException('Unsupported file type');
      }

      return { stream, size };
    } catch (err) {
      throw new BadRequestException(`Invalid file: ${err.message}`);
    }
  }

  private validateImage(size: number, width?: number, height?: number): void {
    if (size > this.config.maxImageSize) {
      throw new BadRequestException(
        `Image file size exceeds the limit of ${this.config.maxImageSize / (1024 * 1024)}MB`,
      );
    }
    if ((width && width > this.config.maxImageWidth) || (height && height > this.config.maxImageHeight)) {
      throw new BadRequestException(
        `Image dimensions exceed the limit of ${this.config.maxImageWidth}x${this.config.maxImageHeight}`,
      );
    }
  }

  private validateVideo(size: number): void {
    if (size > this.config.maxVideoSize) {
      throw new BadRequestException(
        `Video file size exceeds the limit of ${this.config.maxVideoSize / (1024 * 1024)}MB`,
      );
    }
  }
}