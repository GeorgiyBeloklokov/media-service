# Prisma Database Structure & Configuration

## Overview
Prisma ORM provides type-safe access to PostgreSQL database with automatic TypeScript type generation and schema migrations.

## Database Schema (`prisma/schema.prisma`)

### Configuration
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### Media Model
```prisma
model Media {
  id          Int         @id @default(autoincrement())
  uploaderId  Int         // User ID who uploaded the file
  name        String      // Original filename
  description String?     // Optional description
  mimeType    String      // File MIME type (image/jpeg, video/mp4, etc.)
  size        Int         // File size in bytes
  width       Int?        // Image/video width (optional)
  height      Int?        // Image/video height (optional)
  duration    Int?        // Video duration in seconds (optional)
  originalUrl String      // Path to original file in S3
  thumbnails  Json?       // JSON array with thumbnail data
  status      MediaStatus @default(PENDING) // Processing status
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  processedAt DateTime?   // Processing completion time

  @@index([createdAt])           // Index for date sorting
  @@index([status, createdAt])   // Composite index for filtering
  @@index([uploaderId])          // Index for user file search
}
```

### Media Status Enum
```prisma
enum MediaStatus {
  PENDING    // File uploaded, awaiting processing
  PROCESSING // File being processed (thumbnail generation)
  READY      // Processing completed successfully
  FAILED     // Processing error
}
```

## PrismaService (`src/prisma/prisma.service.ts`)

### Service Implementation
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
```

### Key Features
- **Dependency Injection**: Integrated into NestJS DI container
- **Auto-Connect**: Automatic connection on module initialization
- **Type Safety**: Full typing of all database operations
- **Transaction Support**: Transaction support via `$transaction()`

### Usage Patterns
```typescript
// Creating record with transaction
return await this.prisma.$transaction(async (prisma) => {
  const media = await prisma.media.create({ data: mediaData });
  await this.queueService.enqueue({ mediaId: media.id });
  return media;
});

// Search with filtering and pagination
const media = await this.prisma.media.findMany({
  where: { status: 'READY', uploaderId },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});
```

## Auto-Initialization System

### Database Initialization Script (`scripts/init-db.js`)
Smart database initialization system with fallback logic:

```javascript
async function initDatabase() {
  try {
    // 1. Check migration status
    execSync('npx prisma migrate status', { stdio: 'pipe' });
    console.log('✅ Database is already initialized');
  } catch (error) {
    // 2. Apply existing migrations
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    } catch (migrateError) {
      // 3. Fallback: direct schema creation
      execSync('npx prisma db push', { stdio: 'inherit' });
    }
  }
  
  // 4. Generate Prisma Client
  execSync('npx prisma generate', { stdio: 'inherit' });
}
```

### Initialization Flow
1. **Status Check** - Checks if database is initialized
2. **Migration Deploy** - Applies existing migrations (production-ready)
3. **Schema Push** - Fallback for development (if no migrations exist)
4. **Client Generation** - Generates typed Prisma Client

### Docker Integration
```dockerfile
# Dockerfile
COPY scripts/init-db.js ./scripts/
CMD ["sh", "-c", "node scripts/init-db.js && node dist/src/main.js"]
```

### Benefits
- ✅ **Works from scratch** - new developers can start the project immediately
- ✅ **Safe** - doesn't break existing databases
- ✅ **Smart logic** - automatically chooses the right initialization method
- ✅ **Logging** - clear messages about initialization process
- ✅ **Fault tolerance** - graceful fallback on errors
- ✅ **Production Safe** - uses migrations in production environment
- ✅ **Idempotent** - safe to run multiple times

## Migration Management

### Initial Migration (`prisma/migrations/20241004000000_init/migration.sql`)
```sql
-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Media" (
    "id" SERIAL NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    -- ... other fields
    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_uploaderId_idx" ON "Media"("uploaderId");
CREATE INDEX "Media_status_idx" ON "Media"("status");
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");
```

### Migration Lock (`prisma/migrations/migration_lock.toml`)
```toml
provider = "postgresql"
```

## Environment Configuration

### Required Environment Variables
```env
DATABASE_URL="postgresql://user:password@localhost:5432/media_service?schema=public"
```

### Docker Compose Integration
```yaml
backend:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
  depends_on:
    db:
      condition: service_healthy
```

## Performance Optimizations

### Database Indexes
- **Primary Key**: `id` (auto-increment)
- **Composite Index**: `(status, createdAt)` for filtering active files
- **User Index**: `uploaderId` for searching user files
- **Temporal Index**: `createdAt` for time-based sorting

### Query Patterns
- **Pagination**: `skip` + `take` for efficient pagination
- **Filtering**: Composite indexes for fast filtering
- **Transactions**: Atomic operations for data consistency

## Development Workflow

### Local Development
```bash
# Apply schema changes
npx prisma db push

# Create migration
npx prisma migrate dev --name feature_name

# Generate client
npx prisma generate
```

### Production Deployment
```bash
# Apply migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```