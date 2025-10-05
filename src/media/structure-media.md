# Media Module - Architecture & Structure

## Overview
The Media Module is the core API service responsible for media file uploads, storage management, and CRUD operations. It provides RESTful endpoints for media management while coordinating with background processing services for asynchronous thumbnail generation and metadata extraction.

## Core Purpose
- **File Upload Management** - Handle multipart file uploads with validation
- **Media CRUD Operations** - Create, read, update, delete media records
- **Storage Coordination** - Manage file storage in MinIO S3-compatible storage
- **Queue Integration** - Enqueue processing jobs for background workers
- **API Documentation** - Provide Swagger/OpenAPI documentation

## Directory Structure

```
media/
├── config/
│   └── media-config.ts           # Centralized configuration management
├── dto/
│   ├── create-media.dto.ts       # Request validation for media creation
│   ├── media-filter.dto.ts       # Query parameters for filtering/pagination
│   ├── media-response.dto.ts     # Response structure and status enums
│   └── update-media.dto.ts       # Request validation for media updates
├── services/
│   ├── file-validator.ts         # File validation logic (size, type, dimensions)
│   ├── media-processor.ts        # Media processing utilities and data builders
│   ├── query-builder.ts          # Prisma query construction for filtering
│   └── response-mapper.ts        # DTO mapping with presigned URLs
├── media.controller.ts           # REST API endpoints and request handling
├── media.service.ts              # Business logic coordination
├── media.module.ts               # Module configuration and dependency injection
└── structure-media.md            # This architecture documentation
```

## Component Architecture

### 1. Configuration (`config/`)

#### `media-config.ts`
**Purpose**: Centralized configuration management and environment variable parsing

**Responsibilities**:
- **Environment Loading** - Parse and validate environment variables
- **Type Safety** - Provide strongly typed configuration interface
- **Default Values** - Fallback values for all configuration options
- **Validation** - Ensure configuration consistency and validity

**Configuration Properties**:
- `maxImageSize` - Computed image file size limit in bytes
- `maxVideoSize` - Computed video file size limit in bytes
- `maxImageWidth/Height` - Image dimension constraints
- `thumbnailSizes` - Parsed thumbnail size specifications

**Benefits**:
- Centralized configuration logic
- Eliminates constructor complexity in MediaService
- Reusable across multiple services
- Type-safe configuration access

### 2. DTOs (`dto/`)
**Purpose**: Request/response validation and API contract definition

#### `create-media.dto.ts`
- **Validation Rules** - File size, MIME type, dimensions validation
- **Type Transformation** - String to number conversion for form data
- **Swagger Documentation** - API property descriptions and examples

#### `media-filter.dto.ts`
- **Query Parameters** - Pagination, sorting, filtering options
- **Search Functionality** - Text search across name and description
- **Date Filtering** - Upload date range filtering

#### `media-response.dto.ts`
- **Response Structure** - Complete media entity representation
- **Status Enum** - PENDING, PROCESSING, READY, FAILED states
- **Thumbnail Data** - Array of generated thumbnail metadata

### 3. Services (`services/`)

#### `file-validator.ts`
**Purpose**: File validation logic with configurable limits

**Responsibilities**:
- **Size Validation** - Separate limits for images and videos
- **Type Validation** - MIME type checking and support
- **Dimension Validation** - Maximum width/height constraints for images
- **Error Messages** - Clear validation error descriptions

**Configuration Integration**:
- Uses `MediaConfig` for all validation limits
- Accesses `config.maxImageSize/maxVideoSize` for size validation
- Uses `config.maxImageWidth/maxImageHeight` for dimension validation
- Type-safe configuration access

#### `media-processor.ts`
**Purpose**: Media processing utilities and data transformation

**Responsibilities**:
- **Object Key Generation** - Hierarchical storage key creation with UUID
- **Metadata Extraction** - Image dimension extraction using Sharp
- **Data Builders** - Prisma create data and SQS message construction
- **Type Safety** - Strongly typed data transformation

**Configuration Integration**:
- Uses `MediaConfig` for thumbnail specifications
- Accesses `config.thumbnailSizes` in queue message building
- Ready for future configuration extensions

**Key Methods**:
- `generateObjectKey()` - Creates date-based storage hierarchy
- `extractImageDimensions()` - Sharp-based metadata extraction
- `buildMediaCreateData()` - Prisma-compatible data structure
- `buildQueueMessage()` - SQS message with processing specifications

#### `query-builder.ts`
**Purpose**: Prisma query construction for complex filtering

**Responsibilities**:
- **Where Clause Building** - Dynamic filter construction
- **Search Logic** - Case-insensitive text search across fields
- **Date Range Filtering** - Created date range queries
- **Sorting Logic** - Configurable sort order construction

**Configuration Independence**:
- No MediaConfig dependency (pure query logic)
- Works only with DTO input parameters
- Stateless query construction

**Features**:
- Type-safe Prisma query building
- Flexible filter combinations
- Optimized database queries

#### `response-mapper.ts`
**Purpose**: Entity to DTO mapping with URL generation

**Responsibilities**:
- **Presigned URL Generation** - Secure file access URLs
- **Thumbnail Mapping** - Process thumbnail array with URLs
- **Parallel Processing** - Concurrent URL generation for performance
- **Type Transformation** - Database entity to API response conversion

**Configuration Independence**:
- No MediaConfig dependency (pure mapping logic)
- Works only with StorageService for URL generation
- Stateless entity transformation

### 4. Controller (`media.controller.ts`)
**Purpose**: REST API endpoints and HTTP request handling

**Endpoints**:
- `POST /media/upload` - Multipart file upload with metadata
- `GET /media/:id` - Single media retrieval by ID
- `GET /media` - Paginated media list with filtering
- `PUT /media/:id` - Media metadata updates
- `DELETE /media/:id` - Media deletion

**Features**:
- **Swagger Documentation** - Complete API documentation
- **File Upload Handling** - Multer integration for multipart forms
- **Validation Pipes** - Automatic DTO validation
- **Error Handling** - HTTP status code management

### 5. Service (`media.service.ts`)
**Purpose**: Business logic coordination and service orchestration

**Responsibilities**:
- **Service Coordination** - Delegate to specialized service classes
- **Transaction Management** - Database transaction coordination
- **Error Handling** - Business logic error management
- **Logging** - Structured logging for operations

**Architecture Pattern**:
```typescript
MediaService (Coordinator)
├── MediaConfig (shared configuration)
├── FileValidator(config) ✅ - Uses MediaConfig
├── MediaProcessor(config) ✅ - Uses MediaConfig
├── QueryBuilder() ❌ - No config needed
└── ResponseMapper(storageService) ❌ - No config needed
```

**Constructor Simplification**:
- Single `MediaConfig` instance creation
- Shared config passed to relevant services
- Clean dependency injection
- No inline configuration logic
- Improved testability

### 6. Module (`media.module.ts`)
**Purpose**: Dependency injection and module configuration

**Dependencies**:
- **PrismaModule** - Database access
- **StorageModule** - MinIO file operations
- **QueueModule** - SQS message handling
- **ConfigModule** - Environment configuration

## Processing Workflow

### 1. Configuration Initialization Flow
```
MediaService Constructor
├── MediaConfig.new(ConfigService) - Load environment variables
├── FileValidator.new(config) - Initialize with validation limits
├── MediaProcessor.new(config) - Configure with thumbnail specs
├── QueryBuilder.new() - Initialize stateless query builder
└── ResponseMapper.new(StorageService) - Configure URL generation
```

### 2. File Upload Flow
```
Client Request → Controller Validation → Service Coordination
├── FileValidator.validate() - File validation
├── MediaProcessor.generateObjectKey() - Storage key
├── MediaProcessor.extractImageDimensions() - Metadata
├── StorageService.uploadFile() - MinIO upload
├── Database Transaction
│   ├── MediaProcessor.buildMediaCreateData() - Create record
│   ├── MediaProcessor.buildQueueMessage() - Queue job
│   └── QueueService.enqueue() - Background processing
└── ResponseMapper.mapMediaToResponseDto() - API response
```

### 3. Media Retrieval Flow
```
Client Request → Controller → Service
├── QueryBuilder.buildWhereClause() - Filter construction
├── QueryBuilder.buildOrderByClause() - Sort construction
├── Prisma.findMany() - Database query
└── ResponseMapper.mapMediaToResponseDto() - URL generation
```

### 4. Response Mapping Flow
```
Database Entity → ResponseMapper
├── StorageService.generatePresignedUrl() - Original file URL
├── mapThumbnails() - Process thumbnail array
│   └── Parallel presigned URL generation
└── Complete MediaResponseDto - Type-safe response
```

## Configuration Management

### MediaConfig Class
**Purpose**: Centralized configuration with type safety and validation

**Environment Variables**:
- **MAX_FILE_SIZE_IMAGE_MB** - Image upload size limit (default: 10MB)
- **MAX_FILE_SIZE_VIDEO_MB** - Video upload size limit (default: 200MB)
- **MAX_IMAGE_WIDTH/HEIGHT** - Image dimension limits (default: 1920x1080)
- **THUMBNAIL_SIZES** - JSON array of thumbnail specifications

**Configuration Processing**:
- Automatic MB to bytes conversion for file sizes
- JSON parsing for thumbnail size arrays
- Type-safe property access
- Immutable configuration object

**Usage Pattern**:
```typescript
const config = new MediaConfig(configService);
const validator = new FileValidator(config);
const processor = new MediaProcessor(config);
```

**Service Configuration Matrix**:
- **FileValidator** - Uses full MediaConfig (validation limits)
- **MediaProcessor** - Uses MediaConfig (thumbnail specifications)
- **QueryBuilder** - No configuration needed (pure query logic)
- **ResponseMapper** - No configuration needed (pure mapping logic)

### Validation Rules
- **Supported MIME Types** - `image/*` and `video/*`
- **File Extensions** - Preserved from original filename
- **Storage Hierarchy** - `originals/YYYY/MM/uuid.ext`

## Integration Points

### External Services
- **MinIO S3** - File storage with presigned URL access
- **PostgreSQL** - Media metadata and status persistence
- **SQS** - Background job queue for processing
- **ImagorVideo** - Thumbnail generation (via worker)

### Internal Dependencies
- **PrismaService** - Type-safe database operations
- **StorageService** - S3-compatible file operations
- **QueueService** - SQS message handling
- **ConfigService** - Environment-based configuration

## Error Handling Strategy

### Validation Errors
- **File Size Exceeded** - Clear size limit messages
- **Unsupported Type** - MIME type validation errors
- **Dimension Limits** - Image size constraint errors
- **Missing Fields** - Required field validation

### Processing Errors
- **Storage Failures** - MinIO upload error handling
- **Database Errors** - Transaction rollback on failures
- **Queue Errors** - Background job enqueue failures
- **Metadata Extraction** - Graceful Sharp processing failures

## API Documentation

### Swagger Integration
- **Request/Response Schemas** - Complete DTO documentation
- **File Upload Examples** - Multipart form specifications
- **Error Response Formats** - Standardized error structures
- **Authentication Requirements** - Security scheme documentation

### Response Formats
```typescript
MediaResponseDto {
  id: number;
  uploaderId: number;
  name: string;
  description?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  originalUrl: string;        // Presigned URL
  thumbnails: ThumbnailData[]; // Array with presigned URLs
  status: MediaStatus;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}me: string;
  description?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  originalUrl: string;        // Presigned URL
  thumbnails: ThumbnailData[]; // Array with presigned URLs
  status: MediaStatus;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
```

## Performance Optimizations

### Parallel Processing
- **URL Generation** - Concurrent presigned URL creation
- **Thumbnail Mapping** - Parallel thumbnail URL processing
- **Database Queries** - Optimized Prisma queries with proper indexing

### Caching Strategy
- **Presigned URLs** - Short-lived URLs for security
- **Configuration** - Cached in MediaConfig instance
- **Query Results** - Potential Redis integration for frequent queries

## Architecture Benefits

### Separation of Concerns
- **MediaConfig** - Handles all configuration logic
- **FileValidator** - Focused on validation rules (config-dependent)
- **MediaProcessor** - Pure processing utilities (config-dependent)
- **QueryBuilder** - Database query construction (config-independent)
- **ResponseMapper** - DTO transformation (config-independent)

### Maintainability
- **Single Responsibility** - Each class has one clear purpose
- **Dependency Injection** - Clean constructor patterns
- **Type Safety** - Strong typing throughout
- **Testability** - Easy to mock and test individual components

### Scalability
- **Modular Design** - Components can be extended independently
- **Configuration Flexibility** - Easy to add new configuration options
- **Service Reusability** - Classes can be used in other modules
- **Performance Optimization** - Parallel processing where possible

This architecture ensures maintainable, scalable, and type-safe media management with clear separation of concerns and robust error handling.