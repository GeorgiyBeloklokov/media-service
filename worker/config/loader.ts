import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { WORKER_DEFAULTS } from './defaults';
import { WorkerConfig } from './schema';

export function loadWorkerConfig(): WorkerConfig {
  const config = {
    minio: {
      region: process.env.MINIO_REGION || WORKER_DEFAULTS.minio.region,
      bucket: process.env.MINIO_BUCKET || WORKER_DEFAULTS.minio.bucket,
      endpoint: process.env.MINIO_ENDPOINT || WORKER_DEFAULTS.minio.endpoint,
      rootUser: process.env.MINIO_ROOT_USER || WORKER_DEFAULTS.minio.rootUser,
      rootPassword: process.env.MINIO_ROOT_PASSWORD || WORKER_DEFAULTS.minio.rootPassword,
    },
    imagorVideo: {
      url: process.env.IMAGORVIDEO_URL || WORKER_DEFAULTS.imagorVideo.url,
    },
    concurrency: process.env.WORKER_CONCURRENCY
      ? parseInt(process.env.WORKER_CONCURRENCY, 10)
      : WORKER_DEFAULTS.concurrency,
  };

  const validatedConfig = plainToInstance(WorkerConfig, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Worker configuration validation failed:\n${errors.toString()}`);
  }

  return validatedConfig;
}
