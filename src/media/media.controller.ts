import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
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
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        uploaderId: { type: 'number' },
        name: { type: 'string' },
        description: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        duration: { type: 'number' },
      },
    },
  })
  @ApiOperation({ summary: 'Загрузка нового медиафайла' })
  @ApiCreatedResponse({
    description: 'Медиафайл успешно загружен',
    type: MediaResponseDto,
  })
  async uploadMedia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: 'image/(jpeg|png|gif)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() createMediaDto: CreateMediaDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.uploadMedia(file, createMediaDto);
  }

  @ApiOperation({ summary: 'Получение информации о медиафайле по ID' })
  @ApiOkResponse({
    description: 'Информация о медиафайле',
    type: MediaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Медиафайл не найден' })
  @Get(':id')
  async getMediaById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MediaResponseDto> {
    return this.mediaService.getMediaById(id);
  }

  @ApiOperation({ summary: 'Получение списка медиафайлов' })
  @ApiOkResponse({
    description: 'Список медиафайлов',
    type: [MediaResponseDto],
  })
  @Get()
  async getMedia(
    @Query(new ValidationPipe({ transform: true })) filterDto: MediaFilterDto,
  ): Promise<MediaResponseDto[]> {
    return this.mediaService.getMedia(filterDto);
  }
}
