# Media Service

A comprehensive media processing service built with NestJS that handles file uploads, storage, and asynchronous media processing with thumbnail generation.

## Technologies

*   **Framework**: NestJS with TypeScript
*   **Database**: PostgreSQL with Prisma ORM
*   **Storage**: MinIO (S3-compatible object storage)
*   **Queueing**: Redis-based BullMQ for asynchronous background jobs
*   **Containerization**: Docker and Docker Compose

## Implemented Features

*   **Streaming Uploads**: Handles large file uploads efficiently using streams (`busboy`) to avoid high memory consumption.
*   **Asynchronous Processing**: Media processing (thumbnail generation, metadata extraction) is handled asynchronously by a separate worker process using a BullMQ message queue.
*   **Graceful Shutdown**: Both the API server and the worker implement graceful shutdown to finish in-progress tasks before exiting.
*   **Resilient Job Queueing**: The BullMQ setup allows for automatic retries of failed jobs and tracking of failed jobs, providing resilience.
*   **Health Checks**: A dedicated `/health` endpoint monitors the status of critical dependencies like the database and storage.
*   **Structured and Correlated Logging**: Uses `pino` for structured JSON logging with a `correlationId` to trace requests from the API to the worker.
*   **API Versioning**: API endpoints are versioned (e.g., `/v1/...`) to ensure backward compatibility.
*   **Caching**: Implements a Redis-based caching layer for frequently accessed data, such as presigned URLs for media access.
*   **Security Enhancements**:
    *   **Rate Limiting**: Protects against brute-force attacks.
    *   **Helmet**: Sets security-related HTTP headers.
    *   **Input Sanitization**: Protects against XSS attacks.
*   **Server-Side Validation**: Validates file content and type on the server to ensure uploads are what they claim to be.

## Features

- File upload with validation and processing
- Server-side file type and content validation
- S3-compatible storage (MinIO)
- Asynchronous media processing via BullMQ and Redis
- Automatic thumbnail generation
- PostgreSQL database with Prisma ORM
- Swagger API documentation
- Docker containerization

## Project Architecture

- **NestJS** framework with **TypeScript** as the core technology stack
- **Backend API** and **Worker** as two main service components
- **PostgreSQL** database with **Prisma ORM** for data persistence
- **MinIO** S3-compatible object storage for file management
- **BullMQ and Redis** for asynchronous task processing
- **ImagorVideo** service for thumbnail generation
- **Docker** and **Docker Compose** for containerized deployment

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)

### Run with Docker
```bash
# Clone and navigate to project
git clone <repository-url>
cd media-service

# Start all services
docker-compose up -d --build

# Check logs
docker-compose logs backend
```

### Development vs. Production Environment

The project includes two Docker Compose files, `docker-compose.yml` and `docker-compose.prod.yml`. Both are configured to run the application in a production-like mode where the code is built into the image and hot-reloading is not enabled.

- **`docker-compose.yml`**: This is the primary configuration file. It runs all services with a `restart: on-failure` policy.
- **`docker-compose.prod.yml`**: This is a nearly identical, standalone configuration intended for production deployments. The main difference is it uses a `restart: unless-stopped` policy to ensure services recover from crashes or system reboots.

**To run the default configuration:**
```bash
# Build and start all services
docker-compose up -d --build
```

**To run using the production-specific configuration:**
```bash
# Use the docker-compose.prod.yml file to build and start
docker-compose -f docker-compose.prod.yml up -d --build
```

**Note on Code Changes**: Since neither configuration uses hot-reloading, you must rebuild the service's image after any code change for it to take effect:
`docker-compose up -d --build <service_name>` (e.g., `backend` or `worker`).

### Local Development
```bash
# Install dependencies
npm install

# Setup database
npm run prisma:migrate

# Start development server
npm run start:dev

# Start worker (in separate terminal)
npm run build:worker
node dist/worker/main.js
```

## API Documentation

Access interactive Swagger documentation at **http://localhost:3000/api**

### Available Endpoints
- `POST /v1/media/upload` - Upload media file
- `GET /v1/media/:id` - Get media by ID
- `GET /v1/media` - Get media list with filtering and pagination
- `GET /health` - Health check for all services

## Testing with Postman

### Prerequisites
Ensure all services are running:
```bash
# Start all services
docker-compose up -d

# If you made code changes, rebuild
docker-compose up -d --build


### A. Upload Media File (POST /v1/media/upload)

**URL:** `http://localhost:3000/v1/media/upload`  
**Method:** `POST`  
**Content-Type:** `multipart/form-data` (set automatically by Postman)

**Request Body:** Select `form-data`. Add the following fields:
*   `file` (type: `File`): Select an image (e.g., `.jpg`, `.png`, `.gif`) from your computer.
*   `uploaderId` (type: `Text`): `1` (or any integer)
*   `description` (type: `Text`): `Test upload via Postman` (optional)

**Note:** The server will automatically detect the file's `name`, `mimeType`, and `size`.

**File Constraints:**
- Max file size: Images 10MB, Videos 50MB
- Supported formats: JPEG, PNG, GIF, MP4, AVI, MOV
- Image dimensions: up to 4096x4096

**Expected Result:** 201 Created
```json
{
  "id": 1,
  "uploaderId": 1,
  "name": "My Test Image",
  "description": "Test upload via Postman",
  "mimeType": "image/jpeg",
  "size": 1024000,
  "width": 1920,
  "height": 1080,
  "duration": null,
  "originalUrl": "https://localhost:9000/media/originals/2025/1/<uuid>.jpeg?X-Amz-Algorithm=...",
  "thumbnails": [],
  "status": "PENDING",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z",
  "processedAt": null
}
```

**Note:** Status will be `PENDING` initially. Thumbnails are generated asynchronously by the worker.

### B. Get Media by ID (GET /v1/media/:id)

**URL:** `http://localhost:3000/v1/media/{id}`  
**Method:** `GET`  
**Example:** `http://localhost:3000/v1/media/1`

**Expected Result:** 200 OK (after worker processing)
```json
{
  "id": 1,
  "uploaderId": 1,
  "name": "My Test Image",
  "description": "Test upload via Postman",
  "mimeType": "image/jpeg",
  "size": 1024000,
  "width": 1920,
  "height": 1080,
  "duration": null,
  "originalUrl": "https://localhost:9000/media/originals/2025/1/<uuid>.jpeg?X-Amz-Algorithm=...",
  "thumbnails": [
    {
      "width": 150,
      "height": 150,
      "url": "https://localhost:9000/media/thumbnails/2025/1/1-150x150.jpeg?X-Amz-Algorithm=...",
      "mimeType": "image/jpeg"
    },
    {
      "width": 300,
      "height": 300,
      "url": "https://localhost:9000/media/thumbnails/2025/1/1-300x300.jpeg?X-Amz-Algorithm=...",
      "mimeType": "image/jpeg"
    }
  ],
  "status": "READY",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z",
  "processedAt": "2025-01-01T12:01:30.000Z"
}
```

**Error 404:** Media not found
```json
{
  "statusCode": 404,
  "message": "Media with ID 999 not found",
  "error": "Not Found"
}
```

### C. Get Media List (GET /v1/media)

**URL:** `http://localhost:3000/v1/media`  
**Method:** `GET`

**Query Parameters:** You can add the following parameters for filtering and pagination:
*   `page`: `1` (page number, default 1)
*   `size`: `10` (items per page, default 10)
*   `sort`: `createdAt` (sort field, default `createdAt`)
*   `order`: `desc` (sort order, default `desc`)
*   `mimeType`: `image/jpeg` (filter by MIME type)
*   `uploadedAfter`: `2025-01-01` (filter by date after)
*   `uploadedBefore`: `2025-12-31` (filter by date before)
*   `search`: `test` (search in name or description)

**Example URLs:**
- `http://localhost:3000/v1/media?page=1&size=5`
- `http://localhost:3000/v1/media?mimeType=image/jpeg&sort=createdAt&order=desc`
- `http://localhost:3000/v1/media?uploadedAfter=2025-01-01&search=test`

**Expected Result:** 200 OK
```json
[
  {
    "id": 1,
    "uploaderId": 1,
    "name": "My Test Image",
    "description": "Test upload via Postman",
    "mimeType": "image/jpeg",
    "size": 1024000,
    "width": 1920,
    "height": 1080,
    "duration": null,
    "originalUrl": "https://localhost:9000/media/originals/2025/1/<uuid>.jpeg?X-Amz-Algorithm=...",
    "thumbnails": [
      {
        "width": 150,
        "height": 150,
        "url": "https://localhost:9000/media/thumbnails/2025/1/1-150x150.jpeg?X-Amz-Algorithm=...",
        "mimeType": "image/jpeg"
      }
    ],
    "status": "READY",
    "createdAt": "2025-01-01T12:00:00.000Z",
    "updatedAt": "2025-01-01T12:00:00.000Z",
    "processedAt": "2025-01-01T12:01:30.000Z"
  }
]
```

### D. Health Check (GET /health)

**URL:** `http://localhost:3000/health`  
**Method:** `GET`

**Expected Result:** 200 OK (all services healthy)
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "database": {
    "status": "healthy",
    "responseTime": 15
  },
  "storage": {
    "status": "healthy",
    "responseTime": 25
  },
  "queue": {
    "status": "healthy",
    "responseTime": 10
  }
}
```

**Error 503:** Service unavailable (when components are down)
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "database": {
    "status": "unhealthy",
    "message": "Database connection failed",
    "responseTime": 5000
  }
}
```

### Complete Test Scenario
1. **Health Check**: `GET /health` → 200 OK
2. **Upload File**: `POST /v1/media/upload` with test image → 201 Created
3. **Check List**: `GET /v1/media` → status should be "PENDING"
4. **Wait 30-60 seconds** for worker processing
5. **Check Again**: `GET /v1/media/{id}` → status should be "READY" with thumbnails

### Automated Testing
```bash
# Run automated health check and graceful shutdown test
chmod +x scripts/test-graceful-shutdown.sh
./scripts/test-graceful-shutdown.sh
```

### Additional Notes
- **Asynchronous Processing**: Thumbnail generation happens asynchronously via the worker. Status changes from `PENDING` → `PROCESSING` → `READY`/`FAILED`
- **Graceful Shutdown**: Services handle SIGTERM/SIGINT signals for clean shutdown
- **Health Monitoring**: Use `/health` endpoint for service monitoring and Kubernetes probes
- **Monitoring**: Use `docker-compose logs -f` to watch backend and worker logs during file processing
- **File Size**: Ensure your test files meet the size constraints (10MB for images, 50MB for videos)

## Service URLs

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Swagger**: http://localhost:3000/api
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **PostgreSQL**: localhost:5432 (postgres/password123)

## File Processing Flow

1. **Upload** → File uploaded via API
2. **Stream Handling & Validation** → The original file stream is split into two parallel streams. One stream is used for server-side validation (file type, content, size, dimensions).
3. **Storage** → Simultaneously, the other stream is used to upload the original file directly to MinIO.
4. **Queue** → Processing job sent to BullMQ (in Redis)
5. **Worker** → Background worker processes file
6. **Thumbnail** → Generated via ImagorVideo service
7. **Complete** → Status updated to READY

## Environment Variables

Key configuration in `.env`:
```env
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
MINIO_REGION=
MINIO_BUCKET=
MINIO_ENDPOINT=
PORT=
MAX_FILE_SIZE_IMAGE_MB=
MAX_FILE_SIZE_VIDEO_MB=
MAX_IMAGE_WIDTH=
MAX_IMAGE_HEIGHT=
THUMBNAIL_SIZES=
WORKER_CONCURRENCY=
IMAGORVIDEO_URL=
NODE_ENV=
```

Both the main API and the worker process validate their configuration on startup. If required environment variables are missing or have incorrect values, the service will fail to start and log a descriptive error message.

## Development Commands

```bash
# Build
npm run build
npm run build:worker

# Testing
npm run test
npm run test:e2e

# Database
npm run prisma:migrate
npm run prisma:studio

# Linting
npm run lint
npm run format
```

## Troubleshooting

### Common Issues
- **Port conflicts**: Ensure ports 3000, 5432, 9000, 9001, 8080 are available
- **Docker issues**: Run `docker-compose down` and `docker-compose up -d`
- **Database connection**: Check PostgreSQL container is healthy
- **Worker not processing**: Check worker logs and Redis connection

### Error Codes
- **400**: Validation error - check required fields
- **413**: File too large
- **415**: Unsupported media type
- **404**: Media not found

### Processing Status
- **PENDING**: File uploaded, awaiting processing
- **PROCESSING**: Worker is processing the file
- **READY**: Processing complete, thumbnails generated
- **FAILED**: Processing error occurred

## Monitoring & Debugging

### Performance
- Small images (< 1MB): 1-10 seconds
- Medium images (1-5MB): 10-20 seconds
- Large images (5-10MB): 20-100 seconds
- Videos: 3-180 seconds depending on size and duration

### MinIO Storage
- **Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Original files**: `media/originals/YYYY/MM/`
- **Thumbnails**: `media/thumbnails/YYYY/MM/`

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs backend
docker-compose logs worker
```

## API Versioning

> **Question:** How does the versioning process work?

The versioning process I proposed works as follows:

### 1. Enabling and Configuration

In the `src/main.ts` file, we add the line:

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

*   `type: VersioningType.URI`: This setting indicates to NestJS that the API version will be passed as part of the URL. For example: `/v1/`, `/v2/`, and so on.
*   `defaultVersion: '1'`: This is the default version. If a request comes to an endpoint that has multiple versions, but the version is not specified in the URL, this one will be used.

### 2. Binding the Version to the Controller

When you modify the controller decorator like this:

```typescript
@Controller({ path: 'media', version: '1' })
export class MediaController { ... }
```

You are telling NestJS: "This controller (`MediaController`) is responsible for handling all requests that come to the `/media` path **and** belong to version `1`."

As a result, when a request comes in, for example, `GET /v1/media/123`, NestJS:
1.  Sees the `/v1` prefix and understands that this is a request to **version 1**.
2.  Searches for a controller that is registered for the `media` path and version `1`.
3.  Finds your `MediaController` and passes the request to it.

A request without a version (`GET /media/123`) will return a 404 error because no suitable handler will be found for it.

### 3. How to Add New Versions (e.g., v2)

This is the most important part, ensuring backward compatibility. Suppose you want to fundamentally change the logic for retrieving a media file.

1.  You create a new controller, for example, `MediaV2Controller`.
2.  In it, you specify the new version:
    ```typescript
    @Controller({ path: 'media', version: '2' })
    export class MediaV2Controller {
      // New logic, for example, a different response format
      @Get(':id')
      getMediaByIdV2(@Param('id') id: number) {
        // ...
      }
    }
    ```
3.  You **do not touch** the old `MediaController` (v1).

Now your application will work as follows:
*   A request `GET /v1/media/123` will be handled by the old `MediaController`. Old clients will continue to work as before.
*   A request `GET /v2/media/123` will be handled by the new `MediaV2Controller`. New clients will be able to use the new functionality.

Thus, you can evolve the API without breaking integration with existing systems.
