import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private isShuttingDown = false;

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.logger.log(`Received shutdown signal: ${signal}. Starting graceful shutdown...`);

    try {
      // Закрываем соединения с базой данных
      await this.prisma.$disconnect();
      this.logger.log('Database connections closed');

      this.logger.log('Graceful shutdown completed');
    } catch (error) {
      this.logger.error(`Error during graceful shutdown: ${(error as Error).message}`);
    }
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}
