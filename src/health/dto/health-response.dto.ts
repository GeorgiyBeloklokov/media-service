import { ApiProperty } from '@nestjs/swagger';

export interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  message?: string;
  responseTime?: number;
}

export class HealthResponseDto {
  @ApiProperty({ description: 'Общий статус сервиса' })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({ description: 'Время проверки' })
  timestamp: string;

  @ApiProperty({ description: 'Статус базы данных' })
  database: ServiceStatus;

  @ApiProperty({ description: 'Статус хранилища MinIO' })
  storage: ServiceStatus;

  @ApiProperty({ description: 'Статус очереди SQS' })
  queue: ServiceStatus;
}
