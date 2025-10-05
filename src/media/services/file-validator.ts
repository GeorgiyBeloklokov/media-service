import { BadRequestException } from '@nestjs/common';
import { MediaConfig } from '../config/media-config';
import { CreateMediaDto } from '../dto/create-media.dto';

export class FileValidator {
  constructor(private readonly config: MediaConfig) {}

  validate(createMediaDto: CreateMediaDto): void {
    const { mimeType, size, width, height } = createMediaDto;

    if (mimeType.startsWith('image/')) {
      this.validateImage(size, width, height);
    } else if (mimeType.startsWith('video/')) {
      this.validateVideo(size);
    } else {
      throw new BadRequestException('Unsupported file type');
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
