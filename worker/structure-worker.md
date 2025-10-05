# Media Worker - Architecture & Structure

## Overview
The Media Worker is a standalone background processing service responsible for asynchronous media file processing, thumbnail generation, and status management. It operates independently from the main NestJS API service, consuming messages from SQS queues and processing media files stored in MinIO.

## Core Purpose
- **Asynchronous Processing** - Handles media processing without blocking API requests
- **Thumbnail Generation** - Creates multiple thumbnail sizes for images and videos
- **Status Management** - Updates media processing status in real-time
- **Queue Processing** - Consumes and processes SQS messages reliably
- **Error Handling** - Manages failures and retry logic for robust processing

## Directory Structure

```
worker/
├── types/
│   └── index.ts              # Type definitions and interfaces
├── config/
│   ├── defaults.ts           # Default configuration values
│   └── loader.ts             # Environment configuration loader
├── utils/
│   └── retry.ts              # Retry utility with exponential backoff
├── services/
│   ├── media-processor.ts    # Core media processing logic
│   └── queue-poller.ts       # SQS message polling and handling
└── main.ts                   # Application entry point and orchestration
```

## Component Architecture

### 1. Types (`types/index.ts`)
**Purpose**: Centralized type definitions for type safety and consistency

**Key Interfaces**:
- `WorkerQueueMessage` - SQS message structure with job details
- `MediaRecord` - Database media entity representation
- `ThumbnailData` - Generated thumbnail metadata
- `ThumbnailSize` - Width/height specifications
- `WorkerConfig` - Complete worker configuration structure

**Benefits**:
- Type safety across all modules
- Consistent data structures
- Easy maintenance and updates
- IntelliSense support

### 2. Configuration (`config/`)

#### `defaults.ts`
**Purpose**: Default configuration values for all services

**Configuration Sections**:
- **MinIO Settings** - Storage connection and credentials
- **SQS Settings** - Queue configuration and AWS credentials
- **ImagorVideo Settings** - Thumbnail generation service URL
- **Polling Settings** - Message polling intervals and timeouts

#### `loader.ts`
**Purpose**: Environment-based configuration loading with fallbacks

**Features**:
- Environment variable parsing
- Default value fallbacks
- Type-safe configuration object
- Centralized configuration logic

### 3. Utilities (`utils/`)

#### `retry.ts`
**Purpose**: Robust retry mechanism for external service calls

**Features**:
- Exponential backoff strategy
- Configurable retry attempts
- Generic function wrapper
- Error propagation after max retries

**Usage Pattern**:
```typescript
await fetchWithRetry(() => s3Client.send(command), 3, 1000);
```

### 4. Services (`services/`)

#### `media-processor.ts`
**Purpose**: Core media processing and thumbnail generation logic

**Responsibilities**:
- **Media Validation** - Verify media exists and status
- **File Download** - Retrieve original files from MinIO
- **Thumbnail Generation** - Create multiple sizes via ImagorVideo
- **File Upload** - Store thumbnails back to MinIO
- **Status Updates** - Update database with processing results
- **Error Handling** - Manage processing failures

**Key Methods**:
- `processMessage()` - Main processing orchestration
- `processThumbnails()` - Thumbnail generation workflow
- `updateMediaStatus()` - Database status updates
- `completeProcessing()` - Finalize successful processing

#### `queue-poller.ts`
**Purpose**: SQS message polling and distribution

**Responsibilities**:
- **Continuous Polling** - Long-polling SQS for new messages
- **Message Parsing** - Convert SQS messages to typed objects
- **Error Recovery** - Handle polling errors gracefully
- **Process Coordination** - Delegate processing to MediaProcessor
- **Lifecycle Management** - Manage polling loop and shutdown

**Key Methods**:
- `startPolling()` - Main polling loop
- `pollOnce()` - Single polling iteration
- `sleep()` - Configurable polling intervals

### 5. Main Application (`main.ts`)
**Purpose**: Application entry point and service orchestration

**Responsibilities**:
- **Dependency Injection** - Initialize and wire services
- **Client Configuration** - Setup S3 and SQS clients
- **Service Coordination** - Connect MediaProcessor and QueuePoller
- **Lifecycle Management** - Handle startup, shutdown, and signals
- **Error Handling** - Top-level error management

## Processing Workflow

### 1. Message Reception
```
SQS Queue → QueuePoller.pollOnce() → Parse Message → Validate Structure
```

### 2. Media Processing Pipeline
```
MediaProcessor.processMessage()
├── Validate Media Exists
├── Check Status (PENDING)
├── Update Status → PROCESSING
├── Download Original File
├── Generate Thumbnails
│   ├── For Each Size
│   ├── Call ImagorVideo API
│   ├── Upload to MinIO
│   └── Collect Metadata
├── Update Status → READY
├── Save Thumbnails Array
└── Delete SQS Message
```

### 3. Error Handling
```
Processing Error
├── Log Error Details
├── Update Status → FAILED
├── Keep SQS Message (for retry)
└── Continue Processing Next Message
```

## Configuration Management

### Environment Variables
- **MINIO_*** - MinIO storage configuration
- **AWS_*** - SQS and AWS service configuration
- **SQS_*** - Queue-specific settings
- **IMAGORVIDEO_URL** - Thumbnail service endpoint

### Default Values
All configuration has sensible defaults for development:
- MinIO: `http://minio:9000` with `minioadmin` credentials
- SQS: LocalStack endpoint with test credentials
- ImagorVideo: `http://imagorvideo:8080`
- Polling: 10s wait time, 5s intervals, 5min visibility timeout

## Deployment & Scaling

### Docker Configuration
- **Dockerfile.worker** - Separate container for worker process
- **Independent Scaling** - Scale workers separately from API
- **Resource Isolation** - Dedicated CPU/memory for processing
- **Health Monitoring** - Process-level health checks

### Scaling Strategies
- **Horizontal Scaling** - Multiple worker instances
- **Queue Partitioning** - FIFO queues for ordered processing
- **Load Distribution** - SQS automatically distributes messages
- **Resource Optimization** - CPU-intensive thumbnail generation

## Monitoring & Observability

### Logging Strategy
- **Structured Logging** - Consistent log format with context
- **Processing Stages** - Log each major processing step
- **Error Context** - Include mediaId, jobId, and error details
- **Performance Metrics** - Processing times and throughput

### Key Metrics
- Messages processed per minute
- Processing success/failure rates
- Average processing time per media type
- Queue depth and message age
- Thumbnail generation performance

## Error Handling & Recovery

### Retry Mechanisms
- **Network Calls** - Exponential backoff for S3/SQS operations
- **Processing Failures** - Status updates for failed media
- **Queue Visibility** - Automatic message retry via SQS
- **Service Recovery** - Graceful restart on critical errors

### Failure Scenarios
- **Missing Media** - Skip processing, delete message
- **Invalid Status** - Skip processing, delete message
- **Download Failure** - Retry with backoff, then fail
- **Thumbnail Generation Failure** - Retry, then mark as failed
- **Upload Failure** - Retry with backoff, then fail

## Integration Points

### External Services
- **MinIO S3** - File storage and retrieval
- **PostgreSQL** - Media metadata and status
- **SQS** - Message queue for job coordination
- **ImagorVideo** - Thumbnail and video processing

### Internal Communication
- **Database Updates** - Direct Prisma client connection
- **File Operations** - S3-compatible API calls
- **Message Handling** - SQS SDK for reliable messaging
- **Configuration** - Environment-based service discovery

This architecture ensures reliable, scalable, and maintainable media processing with clear separation of concerns and robust error handling.