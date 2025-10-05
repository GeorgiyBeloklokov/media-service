import { Media } from '@prisma/client';
import { MediaResponseDto, MediaStatus } from '../dto/media-response.dto';
import { StorageService } from '../../storage/storage.service';

interface ThumbnailData {
  url: string;
  width: number;
  height: number;
  mimeType: string;
}

export class ResponseMapper {
  constructor(private readonly storageService: StorageService) {}

  async mapMediaToResponseDto(media: Media): Promise<MediaResponseDto> {
    const [originalUrl, thumbnails] = await Promise.all([
      this.storageService.generatePresignedUrl(media.originalUrl),
      this.mapThumbnails(media.thumbnails),
    ]);

    return {
      id: media.id,
      uploaderId: media.uploaderId,
      name: media.name,
      description: media.description,
      mimeType: media.mimeType,
      size: media.size,
      width: media.width,
      height: media.height,
      duration: media.duration,
      originalUrl,
      thumbnails,
      status: media.status as MediaStatus,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      processedAt: media.processedAt,
    };
  }

  private async mapThumbnails(thumbnails: unknown): Promise<ThumbnailData[]> {
    if (!thumbnails || !Array.isArray(thumbnails)) {
      return [];
    }

    return Promise.all(
      (thumbnails as ThumbnailData[]).map(async (thumb) => ({
        ...thumb,
        url: await this.storageService.generatePresignedUrl(thumb.url),
      })),
    );
  }
}
