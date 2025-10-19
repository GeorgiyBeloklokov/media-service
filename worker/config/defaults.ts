import { WorkerConfig } from './schema';

export const WORKER_DEFAULTS: WorkerConfig = {
  minio: {
    region: 'us-east-1',
    bucket: 'media',
    endpoint: 'http://minio:9000',
    rootUser: 'minioadmin',
    rootPassword: 'minioadmin',
  },
  imagorVideo: {
    url: 'http://imagorvideo:8080',
  },
  concurrency: 3,
};
