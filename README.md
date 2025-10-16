# Media Service

A comprehensive media processing service built with NestJS that handles file uploads, storage, and asynchronous media processing with thumbnail generation.

## Features

- File upload with validation and processing
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
cd media-service-0

# Start all services
docker-compose up -d

# Check logs
docker-compose logs backend
```

### Development vs. Production Environment
The default `docker-compose.yml` file is configured for **development**. It uses local volumes to mount your source code into the containers, enabling hot-reloading for the `api` and `worker` services. This means changes to your code are reflected instantly without rebuilding the image.

For a **production** environment, you should create a separate configuration file, for example `docker-compose.prod.yml`. This file should not mount source code volumes and should be optimized for a production deployment.

**Key Differences in a `docker-compose.prod.yml`:**
- **No source code volumes**: The application code is copied into the image during the build process.
- **Production start command**: Services use `npm run start:prod` instead of `npm run start:dev`.
- **Restart policy**: Services should have a restart policy like `restart: unless-stopped` to ensure they recover from crashes.

**To run in production mode:**
```bash
# Create a docker-compose.prod.yml file and then run:
docker-compose -f docker-compose.prod.yml up -d --build
```

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
*   `name` (type: `Text`): `My Test Image` (or any name)
*   `description` (type: `Text`): `Test upload via Postman` (optional)
*   `mimeType` (type: `Text`): `image/jpeg` (or `image/png`, `image/gif` depending on your file)
*   `size` (type: `Text`): Specify file size in bytes. (You can find this in file properties. Important for server validation).
*   `width` (type: `Text`): `1920` (optional, service will try to determine automatically)
*   `height` (type: `Text`): `1080` (optional, service will try to determine automatically)
*   `duration` (type: `Text`): `0` (for images)

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
2. **Storage** → Original file saved to MinIO
3. **Queue** → Processing job sent to BullMQ (in Redis)
4. **Worker** → Background worker processes file
5. **Thumbnail** → Generated via ImagorVideo service
6. **Complete** → Status updated to READY

## Environment Variables

Key configuration in `.env`:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password123
POSTGRES_DB=media_service
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=password123
PORT=3000
MAX_FILE_SIZE_IMAGE_MB=10
MAX_FILE_SIZE_VIDEO_MB=50
THUMBNAIL_SIZES=[{"width":150,"height":150},{"width":300,"height":300}]
```

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
- Small images (< 1MB): 10-30 seconds
- Medium images (1-5MB): 30-60 seconds
- Large images (5-10MB): 60-120 seconds
- Videos: 60-180 seconds depending on size and duration

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

## Версионирование API

> **Вопрос:** а как будет происходить процесс версионирования расскажи

Процесс версионирования, который я предложил, работает следующим образом:

### 1. Включение и настройка

В файле `src/main.ts` мы добавляем строку:

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

*   `type: VersioningType.URI`: Эта настройка указывает NestJS, что версия API будет передаваться как часть URL-адреса. Например: `/v1/`, `/v2/` и так далее.
*   `defaultVersion: '1'`: Это версия по умолчанию. Если запрос придет на эндпоинт, у которого есть несколько версий, но в URL версия не указана, будет использована эта.

### 2. Привязка версии к контроллеру

Когда вы изменяете декоратор контроллера вот так:

```typescript
@Controller({ path: 'media', version: '1' })
export class MediaController { ... }
```

Вы говорите NestJS: "Этот контроллер (`MediaController`) отвечает за обработку всех запросов, которые приходят на путь `/media` **и** относятся к версии `1`".

В результате, когда поступает запрос, например, `GET /v1/media/123`, NestJS:
1.  Видит префикс `/v1` и понимает, что это запрос к **версии 1**.
2.  Ищет контроллер, который зарегистрирован для пути `media` и версии `1`.
3.  Находит ваш `MediaController` и передает ему запрос.

Запрос без версии (`GET /media/123`) вернет ошибку 404, потому что для него не найдется подходящего обработчика.

### 3. Как добавлять новые версии (например, v2)

Это самая важная часть, обеспечивающая обратную совместимость. Допустим, вы хотите кардинально изменить логику получения медиафайла.

1.  Вы создаете новый контроллер, например, `MediaV2Controller`.
2.  В нем вы указываете новую версию:
    ```typescript
    @Controller({ path: 'media', version: '2' })
    export class MediaV2Controller {
      // Новая логика, например, другой формат ответа
      @Get(':id')
      getMediaByIdV2(@Param('id') id: number) {
        // ...
      }
    }
    ```
3.  Старый `MediaController` (v1) вы **не трогаете**.

Теперь ваше приложение будет работать так:
*   Запрос `GET /v1/media/123` будет обработан старым `MediaController`. Старые клиенты продолжат работать как раньше.
*   Запрос `GET /v2/media/123` будет обработан новым `MediaV2Controller`. Новые клиенты смогут использовать новую функциональность.

Таким образом, вы можете развивать API, не ломая интеграцию с уже существующими системами.
