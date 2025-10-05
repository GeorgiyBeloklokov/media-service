# Media Service

A comprehensive media processing service built with NestJS that handles file uploads, storage, and asynchronous media processing with thumbnail generation.

## Features

- File upload with validation (images: JPEG, PNG, GIF up to 10MB; videos: MP4, AVI, MOV up to 50MB)
- S3-compatible storage (MinIO)
- Asynchronous media processing via SQS queues
- Automatic thumbnail generation
- PostgreSQL database with Prisma ORM
- Swagger API documentation
- Docker containerization

## Project Architecture

- **NestJS** framework with **TypeScript** as the core technology stack
- **Backend API** and **Worker** as two main service components
- **PostgreSQL** database with **Prisma ORM** for data persistence
- **MinIO** S3-compatible object storage for file management
- **SQS (Simple Queue Service)** for asynchronous task processing
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
docker-compose logs -f backend
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

### Swagger UI
Access interactive API documentation at:
- **Docker**: http://localhost:3000/api
- **Local**: http://localhost:3000/api

### Available Endpoints

#### Upload Media File
```
POST /media/upload
Content-Type: multipart/form-data

Required fields:
- file: (binary) - Media file
- uploaderId: (number) - User ID
- name: (string) - File name
- mimeType: (string) - MIME type (e.g., "image/jpeg")
- size: (number) - File size in bytes

Optional fields:
- description: (string) - File description
- width: (number) - Image width in pixels
- height: (number) - Image height in pixels
- duration: (number) - Video duration in seconds
```

#### Get Media by ID
```
GET /media/:id
```

#### Get Media List
```
GET /media?page=1&size=10&sort=createdAt&order=desc&search=test
```

## Testing with Postman

### Health Check
```
GET http://localhost:3000/
```

### Upload Media File
```
POST http://localhost:3000/media/upload
Content-Type: multipart/form-data

Required fields:
- file: (File) - Media file (Images: JPEG/PNG/GIF max 10MB, Videos: MP4/AVI/MOV max 50MB)
- uploaderId: (Number) - User ID
- name: (String) - File name
- mimeType: (String) - MIME type (e.g., "image/jpeg")
- size: (Number) - File size in bytes

Optional fields:
- description: (String) - File description
- width: (Number) - Image width in pixels
- height: (Number) - Image height in pixels
- duration: (Number) - Video duration in seconds
```

### Get Media List
```
GET http://localhost:3000/media

Query parameters (all optional):
- page: (Number) - Page number (default: 1)
- size: (Number) - Page size (default: 10)
- sort: (String) - Sort field: "createdAt", "name", "size" (default: "createdAt")
- order: (String) - Sort order "asc"/"desc" (default: "desc")
- mimeType: (String) - Filter by MIME type
- uploadedAfter: (Date) - Filter by date (after)
- uploadedBefore: (Date) - Filter by date (before)
- search: (String) - Search in file name or description
```

### Get Media by ID
```
GET http://localhost:3000/media/{id}
```

### Complete Test Scenario
1. **Health Check**: `GET /`
2. **Upload File**: `POST /media/upload` with test image
3. **Check List**: `GET /media` - status should be "PENDING"
4. **Wait 30-60 seconds** for worker processing
5. **Check Again**: `GET /media/{id}` - status should be "READY" with thumbnails

## Service URLs

When running with Docker:
- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **PostgreSQL**: localhost:5432 (postgres/password123)

## File Processing Flow

1. **Upload** → File uploaded via API
2. **Storage** → Original file saved to MinIO
3. **Queue** → Processing job sent to SQS
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
- **Port conflicts**: Ensure ports 3000, 5432, 9000, 9001, 4566, 8080 are available
- **Docker issues**: Run `docker-compose down` and `docker-compose up -d`
- **Database connection**: Check PostgreSQL container is healthy
- **File upload fails**: Verify file size (images <10MB, videos <50MB) and type (JPEG/PNG/GIF/MP4/AVI/MOV)
- **Worker not processing**: Check worker logs and SQS queue status

### Error Codes
- **400**: Validation error - check required fields
- **413**: File too large - use images <10MB, videos <50MB
- **415**: Unsupported media type - use JPEG/PNG/GIF/MP4/AVI/MOV
- **404**: Media not found

### Processing Status
- **PENDING**: File uploaded, awaiting processing
- **PROCESSING**: Worker is processing the file
- **READY**: Processing complete, thumbnails generated
- **FAILED**: Processing error occurred

### Monitoring
- **Processing time**: 10-120 seconds depending on file size
- **Check SQS**: `docker exec media-service-0-localstack-1 awslocal sqs get-queue-attributes --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/media-tasks --attribute-names All`
- **MinIO files**: Check uploaded files at http://localhost:9001

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f worker
```