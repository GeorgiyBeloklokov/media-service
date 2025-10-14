import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { ResponseMapper } from './services/response-mapper';
import { FileValidator } from './services/file-validator';
import { MediaProcessor } from './services/media-processor';
import { QueryBuilder } from './services/query-builder';
import { MediaConfig } from './config/media-config';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [PrismaModule, StorageModule, QueueModule, ConfigModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    ResponseMapper,
    FileValidator,
    MediaProcessor,
    QueryBuilder,
    {
      provide: MediaConfig,
      useFactory: (configService: ConfigService) => new MediaConfig(configService),
      inject: [ConfigService],
    },
  ],
})
export class MediaModule {}
