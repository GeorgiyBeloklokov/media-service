#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -s http://localstack:4566/_localstack/health | grep -q '"sqs": "available"'; do
  echo "Waiting for SQS service..."
  sleep 2
done

echo "LocalStack is ready. Creating SQS queues..."

# Create the main queue
aws --endpoint-url=http://localstack:4566 sqs create-queue \
  --queue-name media-tasks \
  --region us-east-1

# Create the DLQ queue
aws --endpoint-url=http://localstack:4566 sqs create-queue \
  --queue-name media-tasks-dlq \
  --region us-east-1

echo "SQS queues created successfully!"