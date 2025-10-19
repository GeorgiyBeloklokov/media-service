import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateMediaDto } from '../media/dto/create-media.dto';
import { MediaFilterDto } from '../media/dto/media-filter.dto';
import { MediaResponseDto } from '../media/dto/media-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FileValidator } from './services/file-validator';
import { MediaProcessor } from './services/media-processor';
import { QueryBuilder } from './services/query-builder';
import { ResponseMapper } from './services/response-mapper';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import busboy from 'busboy';
import { Request } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { MediaConfig } from './config/media-config';
import { PassThrough } from 'stream';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectQueue('media') private readonly mediaQueue: Queue,
    private readonly fileValidator: FileValidator,
    private readonly mediaProcessor: MediaProcessor,
    private readonly queryBuilder: QueryBuilder,
    private readonly responseMapper: ResponseMapper,
    private readonly mediaConfig: MediaConfig,
  ) {}

  async uploadMedia(req: Request, correlationId: string): Promise<MediaResponseDto> {
    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: req.headers });
      const fields: Record<string, string> = {};

      bb.on('field', (name, val) => {
        fields[name] = val;
      });

      bb.on('file', (name, file, info) => {
        if (name === 'file') {
          const objectKey = this.mediaProcessor.generateObjectKey(info.filename);

          const validationStream = new PassThrough();
          file.pipe(validationStream);

          this.fileValidator
            .validate(validationStream, info.mimeType)
            .then(({ stream, size }) => {
              this.storageService
                .uploadStream(objectKey, stream, info.mimeType)
                .then(async () => {
                  const createMediaDto = plainToClass(CreateMediaDto, {
                    ...fields,
                    name: info.filename,
                    mimeType: info.mimeType,
                    size,
                  });
                  const errors = await validate(createMediaDto);
                  if (errors.length > 0) {
                    throw new BadRequestException(errors);
                  }

                  const media = await this.prisma.$transaction(async (prisma) => {
                    const createdMedia = await prisma.media.create({
                      data: this.mediaProcessor.buildMediaCreateData(createMediaDto, objectKey),
                    });

                    const jobPayload = {
                      mediaId: createdMedia.id,
                      objectKey: objectKey,
                      mimeType: info.mimeType,
                      correlationId: correlationId,
                      requestedThumbnailSizes: this.mediaConfig.thumbnailSizes,
                    };
                    await this.mediaQueue.add('process', jobPayload);

                    return createdMedia;
                  });

                  resolve(this.responseMapper.mapMediaToResponseDto(media));
                })
                .catch(reject);
            })
            .catch(reject);
        } else {
          file.resume();
        }
      });

      bb.on('error', reject);

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
