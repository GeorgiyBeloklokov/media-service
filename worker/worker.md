# Media Worker - Architecture & Structure

## Overview
The Media Worker is a standalone background processing service responsible for handling asynchronous tasks from a queue. It operates independently from the main NestJS API service, consuming jobs from a **BullMQ** queue (backed by Redis) to perform tasks like thumbnail generation.

## Core Purpose
- **Asynchronous Processing** - Handles long-running media processing tasks without blocking the API.
- **Thumbnail Generation** - Creates multiple thumbnail sizes for media files by calling the `ImagorVideo` service.
- **Status Management** - Updates the media processing status (`PROCESSING`, `READY`, `FAILED`) in the database.
- **Queue Consumption** - Reliably consumes jobs from a BullMQ queue.
- **Error Handling** - Manages failures and allows BullMQ to handle retries.

## Directory Structure

```
worker/
├── config/
│   ├── defaults.ts           # Default configuration values
│   ├── loader.ts             # Environment configuration loader
│   └── schema.ts             # Class-based schema for config validation
├── services/
│   └── media-processor.ts    # Core media processing logic
├── types/
│   └── index.ts              # Type definitions (e.g., MediaJobPayload)
├── utils/
│   └── retry.ts              # Retry utility with exponential backoff
├── graceful-shutdown.ts      # Handles graceful process termination
├── main.ts                   # Application entry point
└── processor.ts              # Initializes clients and the BullMQ worker
```

## Component Architecture

### 1. Configuration (`config/`)
**Purpose**: Provides a robust, validated, and type-safe configuration for the worker.
- **`schema.ts`**: A class defining the configuration structure with `class-validator` decorators. This ensures that all required environment variables are present and correctly typed at startup.
- **`loader.ts`**: Loads environment variables, transforms them, and validates them against the `schema.ts`. The worker will fail to start if the configuration is invalid.
- **`defaults.ts`**: Provides default values for non-essential configuration.

### 2. `processor.ts`
**Purpose**: The core orchestration file for the worker process.
- **Responsibilities**:
  - Initializes shared clients: `PrismaClient`, `S3Client`.
  - Loads the validated configuration.
  - Instantiates the `MediaProcessor` service.
  - **Creates and configures the BullMQ `Worker`**:
    - Connects to the `media` queue on Redis.
    - Defines the main job processing function, which receives a `job` and calls `media-processor.ts`.
    - Sets concurrency and rate-limiting options.
    - Handles logging for job processing.

### 3. `services/media-processor.ts`
**Purpose**: Implements the specific business logic for processing a media file.
- **Responsibilities**:
  - Updates media status to `PROCESSING`.
  - Downloads the original file from MinIO.
  - Calls the `ImagorVideo` service to generate thumbnails of specified sizes.
  - Uploads the generated thumbnails back to MinIO.
  - On success, updates media status to `READY` and saves thumbnail metadata.
  - On failure, updates media status to `FAILED`.

### 4. `main.ts`
**Purpose**: The main entry point for the worker process.
- **Responsibilities**:
  - Imports the initialized `bullWorker` and `prismaClient` from `processor.ts`.
  - Sets up a `WorkerGracefulShutdown` handler to ensure connections are closed properly on `SIGTERM` or `SIGINT`.
  - Logs that the worker process has started.

## Processing Workflow

### 1. Job Reception
A job is pushed to the `media` queue by the API service. The BullMQ worker, which has a persistent connection to Redis, picks up the job as soon as it's available.

### 2. Media Processing Pipeline
```
BullMQ Worker receives a Job
└── MediaProcessor.processMessage(job.data)
    ├── Validate Media Exists in DB
    ├── Check Status is `PENDING`
    ├── Update Status → `PROCESSING`
    ├── Download Original File from MinIO
    ├── Generate Thumbnails (loop):
    │   ├── Call ImagorVideo API with original file URL
    │   ├── Upload resulting thumbnail to MinIO
    │   └── Collect thumbnail metadata
    ├── On success:
    │   ├── Update Status → `READY`
    │   └── Save thumbnail metadata to the database
    └── Job is automatically removed from the queue by BullMQ
```

### 3. Error Handling
```
Error during processing
├── Log the error with correlation ID and job ID.
├── Update Media Status → `FAILED`.
├── Re-throw the error.
└── BullMQ catches the error and handles the job's failure (e.g., moves it to a 'failed' state or retries based on configuration).
```

## Configuration Management

### Environment Variables
- **`MINIO_*`**: MinIO storage configuration.
- **`DATABASE_URL`**: PostgreSQL connection string.
- **`REDIS_HOST`**, **`REDIS_PORT`**: Redis connection details for BullMQ.
- **`IMAGORVIDEO_URL`**: Thumbnail service endpoint.
- **`WORKER_CONCURRENCY`**: Number of jobs to process concurrently.

## Deployment & Scaling

- **`Dockerfile.worker`**: A dedicated Dockerfile is used to build a lightweight container for the worker process.
- **Independent Scaling**: The number of worker containers can be scaled horizontally, independent of the API, to match the processing load. The `WORKER_CONCURRENCY` setting allows for vertical scaling within a single container.
- **Load Distribution**: BullMQ, using Redis, efficiently distributes jobs among all connected worker instances.

## Integration Points

### External Services
- **MinIO**: For storing and retrieving media files.
- **PostgreSQL**: For reading and updating media metadata.
- **Redis**: Serves as the message broker and backend for the BullMQ queue.
- **ImagorVideo**: The external service responsible for generating thumbnails.

This architecture ensures reliable, scalable, and maintainable background processing, leveraging the robust features of BullMQ for job management and a validated configuration for stability.