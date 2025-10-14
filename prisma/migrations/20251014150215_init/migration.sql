-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Media" (
    "id" SERIAL NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "originalUrl" TEXT NOT NULL,
    "thumbnails" JSONB,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE INDEX "Media_status_createdAt_idx" ON "Media"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Media_uploaderId_idx" ON "Media"("uploaderId");

-- CreateIndex
CREATE INDEX "Media_mimeType_idx" ON "Media"("mimeType");

-- CreateIndex
CREATE INDEX "Media_size_idx" ON "Media"("size");

-- CreateIndex
CREATE INDEX "Media_name_idx" ON "Media"("name");
