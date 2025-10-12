import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set security-related HTTP headers
  app.use(helmet());

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Media Service API')
    .setDescription('API for media file management')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);

  // Handle shutdown signals
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    void app.close();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    void app.close();
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
