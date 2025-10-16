import { ApiProperty } from '@nestjs/swagger';

export interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  message?: string;
  responseTime?: number;
}

export class HealthResponseDto {
  @ApiProperty({ description: 'Overall status of the service' })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({ description: 'The time of the check' })
  timestamp: string;

  @ApiProperty({ description: 'Status of the database' })
  database: ServiceStatus;

  @ApiProperty({ description: 'Status of the MinIO storage' })
  storage: ServiceStatus;
}
