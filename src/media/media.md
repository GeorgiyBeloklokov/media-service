# Media Module - Architecture & Structure

## Overview
The Media Module is the core API service responsible for media file uploads, storage management, and retrieval. It provides RESTful endpoints for media management while coordinating with a background worker for asynchronous thumbnail generation and metadata extraction.

## Core Purpose
- **File Upload Management** - Handle streaming multipart file uploads with server-side validation.
- **Media Retrieval** - Provide endpoints to fetch media records by ID or with advanced filtering.
- **Storage Coordination** - Manage file storage in MinIO S3-compatible storage.
- **Queue Integration** - Enqueue processing jobs for background workers using BullMQ.
- **API Documentation** - Provide Swagger/OpenAPI documentation.

## Directory Structure

```
media/
├── config/
│   └── media-config.ts           # Centralized configuration management
├── constants/
│   └── controller.constants.ts   # Constants for the controller (e.g., Swagger schemas)
├── dto/
│   ├── create-media.dto.ts       # DTO for internal use, populated from file stream
│   ├── media-filter.dto.ts       # Query parameters for filtering/pagination
│   └── media-response.dto.ts     # Response structure for API clients
├── services/
│   ├── file-validator.ts         # File stream validation logic (content type, size)
│   ├── media-processor.ts        # Business logic for key generation and data building
│   ├── query-builder.ts          # Prisma query construction for filtering
│   └── response-mapper.ts        # Maps entities to DTOs with presigned URLs
├── media.controller.ts           # REST API endpoints and request handling
├── media.service.ts              # Business logic orchestration
└── media.module.ts               # Module configuration and dependency injection
```

## Component Architecture

### 1. Configuration (`config/`)

#### `media-config.ts`
**Purpose**: Centralized, type-safe configuration management using `@nestjs/config`.

**Responsibilities**:
- Parses and validates environment variables related to media processing.
- Provides a strongly-typed configuration object to be injected into other services.
- Defines default values for optional settings.

**Key Properties**:
- `maxImageSize`, `maxVideoSize`: File size limits.
- `maxImageWidth`, `maxImageHeight`: Image dimension constraints.
- `thumbnailSizes`: A structured array defining the dimensions for thumbnail generation.

### 2. DTOs (`dto/`)
**Purpose**: Define the shape of data for API requests and responses, with validation rules.

- **`media-filter.dto.ts`**: Defines query parameters for filtering, sorting, and paginating the media list.
- **`media-response.dto.ts`**: Defines the data structure returned to the client, including presigned URLs for accessing files.
- **`create-media.dto.ts`**: An internal DTO used to structure data before creating a database record. It's populated on the server-side from file stream properties, not by the client.

### 3. Services (`services/`)

#### `file-validator.ts`
**Purpose**: Validates an incoming file stream before it's fully processed or stored.
- **Responsibilities**:
  - Validates the file's content type (MIME type) using stream-based analysis.
  - Calculates the file size from the stream.
  - Ensures the file properties adhere to the limits defined in `MediaConfig`.

#### `media-processor.ts`
**Purpose**: Handles business logic related to preparing media data.
- **Responsibilities**:
  - **Object Key Generation**: Creates a unique, hierarchical key (e.g., `YYYY/MM/uuid.ext`) for storing the file in MinIO.
  - **Data Building**: Constructs the data object used to create a new media record in the Prisma database.

#### `query-builder.ts`
**Purpose**: Constructs complex Prisma queries for filtering and sorting media.
- **Responsibilities**:
  - Dynamically builds a `where` clause based on `MediaFilterDto`.
  - Implements logic for text search, date ranges, and other filters.
  - Creates the `orderBy` clause for sorting.

#### `response-mapper.ts`
**Purpose**: Maps Prisma media entities to the `MediaResponseDto` format for client responses.
- **Responsibilities**:
  - Generates secure, short-lived presigned URLs for the original file and its thumbnails using `StorageService`.
  - Caches presigned URLs in Redis to improve performance for repeated requests.

### 4. Controller (`media.controller.ts`)
**Purpose**: Defines the REST API endpoints and handles incoming HTTP requests.

**Endpoints**:
- `POST /v1/media/upload`: Handles streaming file uploads using `busboy`.
- `GET /v1/media/:id`: Retrieves a single media record by its ID. This endpoint is cached.
- `GET /v1/media`: Retrieves a paginated and filterable list of media records.

**Features**:
- **Swagger Documentation**: Complete API documentation for all endpoints.
- **Streaming Uploads**: Uses `busboy` to handle `multipart/form-data` efficiently without buffering large files in memory.
- **Validation Pipes**: Uses NestJS pipes for validating query parameters.

### 5. Service (`media.service.ts`)
**Purpose**: Orchestrates the various services to implement the core business logic.

**Responsibilities**:
- **Service Coordination**: Injects and delegates tasks to the specialized services (`FileValidator`, `MediaProcessor`, etc.).
- **Transaction Management**: Wraps the database record creation and queue job addition in a Prisma `$transaction` to ensure atomicity.
- **Error Handling**: Manages business logic errors and exceptions.
- **Logging**: Implements structured, contextual logging via `nestjs-pino`.

**Architecture Pattern**:
The `MediaService` acts as a coordinator, leveraging NestJS's dependency injection to receive instances of all required services. This follows standard NestJS practices for building maintainable and testable applications.

### 6. Module (`media.module.ts`)
**Purpose**: Configures dependency injection for the entire module.

**Dependencies**:
- **`PrismaModule`**: For database access.
- **`StorageModule`**: For MinIO file operations.
- **`BullModule`**: For interacting with the BullMQ message queue.
- **`CacheModule`**: For Redis-based caching.

## Processing Workflow

### 1. File Upload Flow
```
Client Request (multipart/form-data) → MediaController
└── MediaService.uploadMedia()
    ├── `busboy` parses the request stream.
    ├── The file stream is piped into two PassThrough streams:
    │   ├── 1. `validationStream` → FileValidator.validate()
    │   └── 2. `uploadStream` → StorageService.uploadStream() to MinIO
    ├── After validation and upload succeed:
    │   └── Prisma.$transaction is started
    │       ├── 1. A new `Media` record is created in PostgreSQL with `PENDING` status.
    │       └── 2. A job is added to the 'media' BullMQ queue for the worker to process.
    └── ResponseMapper generates and returns the initial MediaResponseDto.
```
*Metadata extraction (like dimensions and duration) is handled asynchronously by the worker, not during the initial upload.*

### 2. Media Retrieval Flow
```
Client Request → MediaController → MediaService
├── QueryBuilder builds the `where` and `orderBy` clauses from filter DTO.
├── PrismaService executes the `findMany` or `findUnique` query.
└── ResponseMapper.mapMediaToResponseDto()
    ├── Checks Redis cache for existing presigned URLs.
    ├── If not cached, generates new presigned URLs for the original file and thumbnails via StorageService.
    ├── Caches the new URLs.
    └── Returns the complete DTO to the client.
```

## Integration Points

### External Services
- **MinIO**: S3-compatible object storage.
- **PostgreSQL**: Database for persisting media metadata.
- **Redis**: Used for both caching (`@nestjs/cache-manager`) and as a message broker for BullMQ.
- **ImagorVideo**: External service for thumbnail generation, called by the worker.

### Internal Dependencies
- **`PrismaService`**: Type-safe database access.
- **`StorageService`** (from `StorageModule`): Interacts with MinIO.
- **`BullMQ` Queue**: Injected for adding jobs.

## Error Handling Strategy
- **Validation Errors**: Handled via `FileValidator` and NestJS's `ValidationPipe`. Throws `BadRequestException`.
- **Processing Errors**:
  - **Storage/Database**: Failures during the upload transaction cause a rollback.
  - **Queue Errors**: Handled to ensure jobs are not lost if Redis is temporarily unavailable.
  - **Not Found**: `getMediaById` throws a `NotFoundException` for invalid IDs.

This architecture ensures a maintainable, scalable, and type-safe media management system with a clear separation of concerns and robust, asynchronous processing.