#!/bin/bash

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until mc alias set minio http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}; do
  echo "MinIO not ready yet, waiting..."
  sleep 2
done

echo "MinIO is ready. Setting up bucket policy..."

# Create bucket if it doesn't exist
mc mb minio/${MINIO_BUCKET} --ignore-existing

# Set public read policy for the bucket
mc anonymous set public minio/${MINIO_BUCKET}

echo "MinIO bucket ${MINIO_BUCKET} configured with public read access"