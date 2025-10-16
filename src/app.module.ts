import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MediaModule } from './media/media.module';
import { HealthModule } from './health/health.module';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'redis',
        port: 6379,
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const existingId = req.id ?? req.headers['x-correlation-id'];
          if (existingId) return existingId;
          const id = randomUUID();
          res.setHeader('X-Correlation-Id', id);
          return id;
        },
        transport: {
          targets: [
            {
              target: 'pino-roll',
              level: 'info',
              options: {
                file: 'logs/api.log',
                frequency: 'daily',
                size: '10m',
                mkdir: true,
                limit: { count: 7 },
              },
            },
            {
              target: 'pino-pretty',
              level: 'info',
              options: {
                singleLine: true,
                colorize: true,
              },
            },
          ],
        },
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute in milliseconds
        limit: 100, // 100 requests
      },
    ]),
    CacheModule.register({
      isGlobal: true,
      store: 'redis',
      host: 'redis',
      port: 6379,
    }),
    PrismaModule,
    MediaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    GracefulShutdownService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
