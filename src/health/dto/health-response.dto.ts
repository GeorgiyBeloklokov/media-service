import { ApiProperty } from '@nestjs/swagger';

export class ServiceStatus {
  @ApiProperty({ enum: ['healthy', 'unhealthy'], example: 'healthy' })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({ required: false, example: 'Database connection failed' })
  message?: string;

  @ApiProperty({ example: 15 })
  responseTime?: number;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['healthy', 'unhealthy'], example: 'healthy' })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ type: ServiceStatus })
  database: ServiceStatus;

  @ApiProperty({ type: ServiceStatus })
  storage: ServiceStatus;

  @ApiProperty({ type: ServiceStatus })
  queue: ServiceStatus;
}
