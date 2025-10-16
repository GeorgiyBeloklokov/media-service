import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import { HealthResponseDto, ServiceStatus } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly queueService: QueueService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HealthService.name);
  }

  async checkHealth(): Promise<HealthResponseDto> {
    const checks = await Promise.allSettled([this.checkDatabase(), this.checkStorage(), this.checkQueue()]);

    const [database, storage, queue] = checks.map((result) =>
      result.status === 'fulfilled' ? result.value : { status: 'unhealthy' as const, message: 'Check failed' },
    );

    const overallStatus = [database, storage, queue].every((check) => check.status === 'healthy')
      ? ('healthy' as const)
      : ('unhealthy' as const);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database,
      storage,
      queue,
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ error: error as Error }, `Database health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkStorage(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.storageService.checkConnection();
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ error: error as Error }, `Storage health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        message: 'Storage connection failed',
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkQueue(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.queueService.checkConnection();
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ error: error as Error }, `Queue health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        message: 'Queue connection failed',
        responseTime: Date.now() - start,
      };
    }
  }
}
