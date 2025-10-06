#!/bin/bash

echo "🧪 Testing Graceful Shutdown..."

# Start services
echo "Starting services..."
docker-compose up -d
sleep 10

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "Health response: $HEALTH_RESPONSE"

# Test graceful shutdown
echo "Testing graceful shutdown..."
CONTAINER_ID=$(docker-compose ps -q backend)
echo "Backend container ID: $CONTAINER_ID"

# Send SIGTERM and capture logs
docker kill --signal=SIGTERM $CONTAINER_ID &
sleep 2
docker-compose logs --tail=10 backend

# Test worker shutdown
echo "Testing worker graceful shutdown..."
WORKER_ID=$(docker-compose ps -q worker)
echo "Worker container ID: $WORKER_ID"

docker kill --signal=SIGTERM $WORKER_ID &
sleep 2
docker-compose logs --tail=10 worker

echo "✅ Graceful shutdown test completed"