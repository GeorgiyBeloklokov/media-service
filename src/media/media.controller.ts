import {
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { UPLOAD_SCHEMA } from './constants/controller.constants';
import { MediaFilterDto } from './dto/media-filter.dto';
import { MediaResponseDto } from './dto/media-response.dto';
import { MediaService } from './media.service';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { PinoLogger, Logger } from 'nestjs-pino';

@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @Inject(Logger) private readonly logger: PinoLogger,
  ) {}

  @Post('/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: UPLOAD_SCHEMA })
  @ApiOperation({ summary: 'Upload new media file' })
  @ApiCreatedResponse({
    description: 'Media file successfully uploaded',
    type: MediaResponseDto,
  })
  async uploadMedia(@Req() req: Request & { id: string }): Promise<MediaResponseDto> {
    const correlationId = req.id;
    return this.mediaService.uploadMedia(req, correlationId);
  }

  @ApiOperation({ summary: 'Get media file information by ID' })
  @ApiOkResponse({
    description: 'Media file information',
    type: MediaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Media file not found' })
  @UseInterceptors(CacheInterceptor)
  @Get(':id')
  async getMediaById(@Param('id', ParseIntPipe) id: number): Promise<MediaResponseDto> {
    return this.mediaService.getMediaById(id);
  }

  @ApiOperation({ summary: 'Get list of media files' })
  @ApiOkResponse({
    description: 'List of media files',
    type: [MediaResponseDto],
  })
  @Get()
  async getMedia(
    @Query(new ValidationPipe({ transform: true })) filterDto: MediaFilterDto,
  ): Promise<MediaResponseDto[]> {
    return this.mediaService.getMedia(filterDto);
  }
}
