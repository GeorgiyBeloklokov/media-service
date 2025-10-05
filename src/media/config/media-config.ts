import { ConfigService } from '@nestjs/config';

export interface ThumbnailSize {
  width: number;
  height: number;
}

export class MediaConfig {
  readonly maxImageSize: number;
  readonly maxVideoSize: number;
  readonly maxImageWidth: number;
  readonly maxImageHeight: number;
  readonly thumbnailSizes: ThumbnailSize[];

  constructor(configService: ConfigService) {
    this.maxImageSize = configService.get<number>('MAX_FILE_SIZE_IMAGE_MB', 10) * 1024 * 1024;
    this.maxVideoSize = configService.get<number>('MAX_FILE_SIZE_VIDEO_MB', 50) * 1024 * 1024;
    this.maxImageWidth = configService.get<number>('MAX_IMAGE_WIDTH', 1920);
    this.maxImageHeight = configService.get<number>('MAX_IMAGE_HEIGHT', 1080);
    this.thumbnailSizes = JSON.parse(
      configService.get<string>('THUMBNAIL_SIZES', '[{"width":150,"height":150},{"width":300,"height":300}]'),
    ) as ThumbnailSize[];
  }
}
