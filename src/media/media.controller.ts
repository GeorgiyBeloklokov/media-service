import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FILE_VALIDATORS, UPLOAD_SCHEMA } from './constants/controller.constants';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaFilterDto } from './dto/media-filter.dto';
import { MediaResponseDto } from './dto/media-response.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: UPLOAD_SCHEMA })
  @ApiOperation({ summary: 'Upload new media file' })
  @ApiCreatedResponse({
    description: 'Media file successfully uploaded',
    type: MediaResponseDto,
  })
  async uploadMedia(
    @UploadedFile(new ParseFilePipe({ validators: FILE_VALIDATORS }))
    file: Express.Multer.File,
    @Body() createMediaDto: CreateMediaDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.uploadMedia(file, createMediaDto);
  }

  @ApiOperation({ summary: 'Get media file information by ID' })
  @ApiOkResponse({
    description: 'Media file information',
    type: MediaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Media file not found' })
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
