import 'reflect-metadata';
import pino from 'pino';
import { bullWorker, prismaClient } from './processor';
import { WorkerGracefulShutdown } from './graceful-shutdown';

const logger = pino();

// Set up graceful shutdown for the new worker
new WorkerGracefulShutdown(prismaClient, () => {
  void bullWorker.close();
});

logger.info('Worker process started.');
