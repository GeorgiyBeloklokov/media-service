import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateMediaDto } from '../media/dto/create-media.dto';
import { MediaFilterDto } from '../media/dto/media-filter.dto';
import { MediaResponseDto } from '../media/dto/media-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { MediaConfig } from './config/media-config';
import { FileValidator } from './services/file-validator';
import { MediaProcessor } from './services/media-processor';
import { QueryBuilder } from './services/query-builder';
import { ResponseMapper } from './services/response-mapper';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly fileValidator: FileValidator;
  private readonly mediaProcessor: MediaProcessor;
  private readonly queryBuilder: QueryBuilder;
  private readonly responseMapper: ResponseMapper;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    const config = new MediaConfig(this.configService);

    this.fileValidator = new FileValidator(config);
    this.mediaProcessor = new MediaProcessor(config);
    this.queryBuilder = new QueryBuilder();
    this.responseMapper = new ResponseMapper(this.storageService);
  }

  async uploadMedia(file: Express.Multer.File, createMediaDto: CreateMediaDto): Promise<MediaResponseDto> {
    this.fileValidator.validate(createMediaDto);

    const objectKey = this.mediaProcessor.generateObjectKey(file.originalname);
    const { width: originalWidth, height: originalHeight } = await this.mediaProcessor.extractImageDimensions(
      file,
      createMediaDto,
    );

    await this.storageService.uploadFile(objectKey, file.buffer, createMediaDto.mimeType);

    return await this.prisma.$transaction(async (prisma) => {
      const media = await prisma.media.create({
        data: this.mediaProcessor.buildMediaCreateData(createMediaDto, objectKey, originalWidth, originalHeight),
      });

      const queueMessage = this.mediaProcessor.buildQueueMessage(media.id, objectKey, createMediaDto.mimeType);
      await this.queueService.enqueue(queueMessage);

      return this.responseMapper.mapMediaToResponseDto(media);
    });
  }

  async getMediaById(id: number): Promise<MediaResponseDto> {
    const media = await this.prisma.media.findUnique({ where: { id } });

    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found`);
    }

    return this.responseMapper.mapMediaToResponseDto(media);
  }

  async getMedia(filterDto: MediaFilterDto): Promise<MediaResponseDto[]> {
    const { page = 1, size = 10 } = filterDto;

    const mediaList = await this.prisma.media.findMany({
      where: this.queryBuilder.buildWhereClause(filterDto),
      orderBy: this.queryBuilder.buildOrderByClause(filterDto.sort, filterDto.order),
      skip: (page - 1) * size,
      take: size,
    });

    return Promise.all(mediaList.map(async (media) => this.responseMapper.mapMediaToResponseDto(media)));
  }
}
