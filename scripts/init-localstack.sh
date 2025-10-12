#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -s http://localstack:4566/_localstack/health | grep -q '"sqs": "available"'; do
  echo "Waiting for SQS service..."
  sleep 2
done

echo "LocalStack is ready. Creating SQS queues..."

# Create the DLQ queue first
aws --endpoint-url=http://localstack:4566 sqs create-queue \
  --queue-name media-tasks-dlq \
  --region us-east-1

# Create the main queue with a redrive policy pointing to the DLQ
aws --endpoint-url=http://localstack:4566 sqs create-queue \
  --queue-name media-tasks \
  --region us-east-1 \
  --attributes '{
    "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"arn:aws:sqs:us-east-1:000000000000:media-tasks-dlq\\",\\"maxReceiveCount\\":\\"3\\"}"
  }'

echo "SQS queues created and configured successfully!"