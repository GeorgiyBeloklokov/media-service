import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MediaModule } from './media/media.module';
import { HealthModule } from './health/health.module';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, MediaModule, HealthModule],
  controllers: [AppController],
  providers: [AppService, GracefulShutdownService],
})
export class AppModule {}
