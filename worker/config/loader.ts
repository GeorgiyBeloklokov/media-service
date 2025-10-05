import { WorkerConfig } from '../types';
import { WORKER_DEFAULTS } from './defaults';

export function loadWorkerConfig(): WorkerConfig {
  return {
    minio: {
      region: process.env.MINIO_REGION || WORKER_DEFAULTS.minio.region,
      bucket: process.env.MINIO_BUCKET || WORKER_DEFAULTS.minio.bucket,
      endpoint: process.env.MINIO_ENDPOINT || WORKER_DEFAULTS.minio.endpoint,
      rootUser: process.env.MINIO_ROOT_USER || WORKER_DEFAULTS.minio.rootUser,
      rootPassword: process.env.MINIO_ROOT_PASSWORD || WORKER_DEFAULTS.minio.rootPassword,
    },
    sqs: {
      region: process.env.AWS_REGION || WORKER_DEFAULTS.sqs.region,
      endpoint: process.env.SQS_ENDPOINT || WORKER_DEFAULTS.sqs.endpoint,
      queueName: process.env.SQS_QUEUE_NAME || WORKER_DEFAULTS.sqs.queueName,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || WORKER_DEFAULTS.sqs.accessKeyId,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || WORKER_DEFAULTS.sqs.secretAccessKey,
    },
    imagorVideo: {
      url: process.env.IMAGORVIDEO_URL || WORKER_DEFAULTS.imagorVideo.url,
    },
    polling: WORKER_DEFAULTS.polling,
  };
}
