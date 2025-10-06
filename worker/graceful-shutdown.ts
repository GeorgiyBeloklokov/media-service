import { PrismaClient } from '@prisma/client';

export class WorkerGracefulShutdown {
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly stopPolling: () => void,
  ) {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', () => void this.shutdown('SIGTERM'));
    process.on('SIGINT', () => void this.shutdown('SIGINT'));
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      return this.shutdownPromise!;
    }

    this.isShuttingDown = true;
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  private async performShutdown(): Promise<void> {
    try {
      // Stop polling for new messages
      this.stopPolling();
      console.log('Stopped polling for new messages');

      // Wait for current processing to complete (max 30 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Close database connection
      await this.prisma.$disconnect();
      console.log('Database connection closed');

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}
