import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import { CreateMediaDto } from '../media/dto/create-media.dto';
import { MediaResponseDto, MediaStatus } from '../media/dto/media-response.dto';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import sharp from 'sharp'; // Для извлечения размеров изображений
import { MediaFilterDto, MediaSortBy } from '../media/dto/media-filter.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxImageSize: number;
  private readonly maxVideoSize: number;
  private readonly maxImageWidth: number;
  private readonly maxImageHeight: number;
  private readonly thumbnailSizes: { width: number; height: number }[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.maxImageSize = this.configService.get<number>('MAX_FILE_SIZE_IMAGE_MB', 10) * 1024 * 1024;
    this.maxVideoSize = this.configService.get<number>('MAX_FILE_SIZE_VIDEO_MB', 200) * 1024 * 1024;
    this.maxImageWidth = this.configService.get<number>('MAX_IMAGE_WIDTH', 1920);
    this.maxImageHeight = this.configService.get<number>('MAX_IMAGE_HEIGHT', 1080);
    this.thumbnailSizes = JSON.parse(this.configService.get<string>('THUMBNAIL_SIZES', '[]'));
  }

  async uploadMedia(
    file: Express.Multer.File,
    createMediaDto: CreateMediaDto,
  ): Promise<MediaResponseDto> {
    const { uploaderId, name, description, mimeType, size, width, height, duration } = createMediaDto;

    // 1. Валидация метаданных файла
    if (mimeType.startsWith('image/')) {
      if (size > this.maxImageSize) {
        throw new BadRequestException(
          `Image file size exceeds the limit of ${this.maxImageSize / (1024 * 1024)}MB`,
        );
      }
      if ((width && width > this.maxImageWidth) || (height && height > this.maxImageHeight)) {
        throw new BadRequestException(
          `Image dimensions exceed the limit of ${this.maxImageWidth}x${this.maxImageHeight}`,
        );
      }
    } else if (mimeType.startsWith('video/')) {
      if (size > this.maxVideoSize) {
        throw new BadRequestException(
          `Video file size exceeds the limit of ${this.maxVideoSize / (1024 * 1024)}MB`,
        );
      }
      // TODO: Add video dimension/duration validation if needed
    } else {
      throw new BadRequestException('Unsupported file type');
    }

    const fileExtension = path.extname(file.originalname);
    const objectKey = `media/originals/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uuidv4()}${fileExtension}`;

    let originalWidth = width;
    let originalHeight = height;
    if (mimeType.startsWith('image/') && !width && !height) {
      try {
        const metadata = await sharp(file.buffer).metadata();
        originalWidth = metadata.width;
        originalHeight = metadata.height;
      } catch (error) {
        this.logger.warn(`Could not get image metadata for ${file.originalname}: ${error.message}`);
      }
    }

    // 2. Сохранение оригинального файла в MinIO
    await this.storageService.uploadFile(objectKey, file.buffer, mimeType);

    return await this.prisma.$transaction(async (prisma) => {
      

      // 3. Создание записи в БД
      const media = await prisma.media.create({
        data: {
          uploaderId: Number(uploaderId),
          name,
          description,
          mimeType,
          size: Number(size),
          width: originalWidth,
          height: originalHeight,
          duration,
          originalUrl: objectKey, // Storing key, will generate presigned URL on retrieval
          status: MediaStatus.PENDING,
        },
      });

      // 4. Отправка сообщения в SQS
      const jobId = uuidv4();
      await this.queueService.enqueue({
        jobId,
        mediaId: media.id,
        objectKey,
        mimeType,
        requestedThumbnailSizes: this.thumbnailSizes,
        retryCount: 0,
      });

      return this.mapMediaToResponseDto(media);
    });
  }

  async getMediaById(id: number): Promise<MediaResponseDto> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found`);
    }

    return this.mapMediaToResponseDto(media);
  }

  async getMedia(filterDto: MediaFilterDto): Promise<MediaResponseDto[]> {
    const { page = 1, size = 10, sort, mimeType, uploadedAfter, uploadedBefore, search } = filterDto;

    // Исправлено: используем правильный тип для orderBy, чтобы избежать ошибки импорта
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    switch (sort) {
      case MediaSortBy.CREATED_AT_ASC:
        orderBy['createdAt'] = 'asc';
        break;
      case MediaSortBy.CREATED_AT_DESC:
      default:
        orderBy['createdAt'] = 'desc';
        break;
    }

    const where: any = {};
    if (mimeType) {
      where.mimeType = mimeType;
    }
    if (uploadedAfter) {
      where.createdAt = { ...where.createdAt, gte: new Date(uploadedAfter) };
    }
    if (uploadedBefore) {
      where.createdAt = { ...where.createdAt, lte: new Date(uploadedBefore) };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const mediaList = await this.prisma.media.findMany({
      where,
      orderBy,
      skip: (page - 1) * size,
      take: size,
    });

    return Promise.all(
      mediaList.map(async (media) => this.mapMediaToResponseDto(media)),
    );
  }

  private async mapMediaToResponseDto(media: any): Promise<MediaResponseDto> {
    const originalUrl = await this.storageService.generatePresignedUrl(media.originalUrl);
    const thumbnails = media.thumbnails
      ? await Promise.all(
          (media.thumbnails as any[]).map(async (thumb: { url: string; width: number; height: number; mimeType: string }) => ({
            ...thumb,
            url: await this.storageService.generatePresignedUrl(thumb.url),
          })),
        )
      : [];

    const response: MediaResponseDto = {
      id: media.id,
      uploaderId: media.uploaderId,
      name: media.name,
      description: media.description,
      mimeType: media.mimeType,
      size: media.size,
      width: media.width,
      height: media.height,
      duration: media.duration,
      originalUrl: originalUrl,
      thumbnails: thumbnails,
      status: media.status,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      processedAt: media.processedAt,
    };
    return response;
  }
}
