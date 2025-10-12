import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import busboy from 'busboy';
import { Request } from 'express';

@Injectable()
export class MediaService {
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

  async uploadMedia(req: Request): Promise<MediaResponseDto> {
    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: req.headers });
      const fields: Record<string, string> = {};

      bb.on('field', (name, val) => {
        fields[name] = val;
      });

      bb.on('file', (name, file, info) => {
        if (name === 'file') {
          const objectKey = this.mediaProcessor.generateObjectKey(info.filename);

          this.storageService
            .uploadStream(objectKey, file, info.mimeType)
            .then(async () => {
              const createMediaDto = plainToClass(CreateMediaDto, fields);
              const errors = await validate(createMediaDto);
              if (errors.length > 0) {
                throw new BadRequestException(errors);
              }

              this.fileValidator.validate({ ...createMediaDto, mimeType: info.mimeType, name: info.filename, size: 0 }); // Size validation is tricky with streams, skipping for now

              const media = await this.prisma.$transaction(async (prisma) => {
                const createdMedia = await prisma.media.create({
                  data: this.mediaProcessor.buildMediaCreateData(createMediaDto, objectKey),
                });

                const queueMessage = this.mediaProcessor.buildQueueMessage(createdMedia.id, objectKey, info.mimeType);
                await this.queueService.enqueue(queueMessage);

                return createdMedia;
              });

              resolve(this.responseMapper.mapMediaToResponseDto(media));
            })
            .catch(reject);
        } else {
          file.resume();
        }
      });

      req.pipe(bb);
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
