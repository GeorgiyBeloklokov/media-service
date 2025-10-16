import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private isShuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GracefulShutdownService.name);
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.logger.info(`Received shutdown signal: ${signal}. Starting graceful shutdown...`);

    try {
      // Закрываем соединения с базой данных
      await this.prisma.$disconnect();
      this.logger.info('Database connections closed');

      this.logger.info('Graceful shutdown completed');
    } catch (error) {
      this.logger.error({ error: error as Error }, `Error during graceful shutdown`);
    }
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}
