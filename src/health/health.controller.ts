import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Проверка состояния сервиса' })
  @ApiResponse({ status: 200, description: 'Сервис работает', type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'Сервис недоступен' })
  async checkHealth(@Res() res: Response): Promise<void> {
    const health = await this.healthService.checkHealth();
    const statusCode = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(health);
  }
}
