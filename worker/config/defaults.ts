import { WorkerConfig } from '../types';

export const WORKER_DEFAULTS: WorkerConfig = {
  minio: {
    region: 'us-east-1',
    bucket: 'media',
    endpoint: 'http://minio:9000',
    rootUser: 'minioadmin',
    rootPassword: 'minioadmin',
  },
  sqs: {
    region: 'us-east-1',
    endpoint: 'http://localstack:4566',
    queueName: 'media-tasks',
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
  imagorVideo: {
    url: 'http://imagorvideo:8080',
  },
  polling: {
    maxMessages: 1,
    waitTimeSeconds: 10,
    visibilityTimeoutSeconds: 300,
    intervalSeconds: 5,
  },
};
