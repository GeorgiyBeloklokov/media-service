# Health Check и Graceful Shutdown - Документация

## Внесенные изменения

### Новые файлы:
- `src/health/health.controller.ts` - REST контроллер для health check
- `src/health/health.service.ts` - Сервис проверки состояния компонентов
- `src/health/health.module.ts` - Модуль health check
- `src/health/dto/health-response.dto.ts` - DTO для ответов health check
- `src/graceful-shutdown.service.ts` - Сервис graceful shutdown для основного приложения
- `worker/graceful-shutdown.ts` - Класс graceful shutdown для worker процесса

### Измененные файлы:
- `src/main.ts` - добавлены signal handlers и enableShutdownHooks()
- `src/app.module.ts` - подключены HealthModule и GracefulShutdownService
- `src/storage/storage.service.ts` - добавлен метод checkConnection()
- `src/queue/queue.service.ts` - добавлен метод checkConnection()
- `worker/main.ts` - интегрирован WorkerGracefulShutdown
- `worker/services/queue-poller.ts` - добавлен метод stopPolling()

## Health Check API

### Endpoint
```
GET /health
```

### Ответы

**200 OK - Все сервисы работают:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "database": {
    "status": "healthy",
    "responseTime": 15
  },
  "storage": {
    "status": "healthy", 
    "responseTime": 25
  },
  "queue": {
    "status": "healthy",
    "responseTime": 10
  }
}
```

**503 Service Unavailable - Есть проблемы:**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "database": {
    "status": "unhealthy",
    "message": "Database connection failed",
    "responseTime": 5000
  },
  "storage": {
    "status": "healthy",
    "responseTime": 20
  },
  "queue": {
    "status": "healthy",
    "responseTime": 12
  }
}
```

## Тестирование Health Check

### 1. Базовая проверка
```bash
# Запустить сервисы
docker-compose up -d

# Проверить health endpoint
curl http://localhost:3000/health

# Проверить статус код
curl -I http://localhost:3000/health
```

### 2. Тест недоступности сервисов

**Тест недоступности PostgreSQL:**
```bash
# Остановить PostgreSQL
docker-compose stop postgres

# Проверить health (должен вернуть 503)
curl -v http://localhost:3000/health
```

**Тест недоступности MinIO:**
```bash
# Остановить MinIO
docker-compose stop minio

# Проверить health (должен вернуть 503)
curl -v http://localhost:3000/health
```

**Тест недоступности SQS:**
```bash
# Остановить LocalStack
docker-compose stop localstack

# Проверить health (должен вернуть 503)
curl -v http://localhost:3000/health
```

### 3. Мониторинг в реальном времени
```bash
# Непрерывная проверка каждые 5 секунд
watch -n 5 'curl -s http://localhost:3000/health | jq'

# Проверка только статуса
watch -n 2 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health'
```

## Тестирование Graceful Shutdown

### 1. Тест основного приложения

**Запуск и остановка:**
```bash
# Запустить приложение
docker-compose up backend

# В другом терминале отправить SIGTERM
docker kill --signal=SIGTERM media-service-0-backend-1

# Проверить логи
docker-compose logs backend
```

**Ожидаемые логи:**
```
SIGTERM received, shutting down gracefully
[GracefulShutdownService] Received shutdown signal: SIGTERM. Starting graceful shutdown...
[GracefulShutdownService] Database connections closed
[GracefulShutdownService] Graceful shutdown completed
```

### 2. Тест worker процесса

**Запуск и остановка:**
```bash
# Запустить worker
docker-compose up worker

# Отправить SIGTERM
docker kill --signal=SIGTERM media-service-0-worker-1

# Проверить логи
docker-compose logs worker
```

**Ожидаемые логи:**
```
Received SIGTERM. Starting graceful shutdown...
Stopped polling for new messages
Database connection closed
Graceful shutdown completed
```

### 3. Тест с активными запросами

**Тест загрузки файла во время shutdown:**
```bash
# Запустить загрузку файла в фоне
curl -X POST http://localhost:3000/media/upload \
  -F "file=@test.jpg" \
  -F "uploaderId=1" \
  -F "name=test" &

# Сразу отправить SIGTERM
docker kill --signal=SIGTERM media-service-0-backend-1

# Проверить, что запрос завершился корректно
```

### 4. Тест различных сигналов

**SIGTERM (рекомендуемый):**
```bash
docker kill --signal=SIGTERM <container_id>
```

**SIGINT (Ctrl+C):**
```bash
docker kill --signal=SIGINT <container_id>
```

**SIGKILL (принудительный, не graceful):**
```bash
docker kill --signal=SIGKILL <container_id>
```

## Автоматизированное тестирование

### Автоматизированный скрипт тестирования
```bash
# Запустить полное тестирование
chmod +x scripts/test-graceful-shutdown.sh
./scripts/test-graceful-shutdown.sh
```

**Скрипт находится в:** `scripts/test-graceful-shutdown.sh`

**Что тестирует скрипт:**
- Запуск всех сервисов
- Health check endpoint
- Graceful shutdown основного приложения
- Graceful shutdown worker процесса
- Проверка логов shutdown

## Kubernetes Integration

### Health Probes конфигурация
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: media-service
spec:
  template:
    spec:
      containers:
      - name: media-service
        image: media-service:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

### Graceful Shutdown в Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: media-service
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

## Мониторинг в Production

### Prometheus метрики (будущее улучшение)
```typescript
// Пример метрик для health check
const healthCheckDuration = new Histogram({
  name: 'health_check_duration_seconds',
  help: 'Duration of health checks',
  labelNames: ['service', 'status']
});

const healthCheckTotal = new Counter({
  name: 'health_check_total',
  help: 'Total number of health checks',
  labelNames: ['service', 'status']
});
```

### Alerting правила
```yaml
# Prometheus alerting rules
groups:
- name: media-service
  rules:
  - alert: MediaServiceUnhealthy
    expr: probe_success{job="media-service-health"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Media Service is unhealthy"
      description: "Health check failed for {{ $labels.instance }}"
      
  - alert: MediaServiceHighLatency
    expr: probe_duration_seconds{job="media-service-health"} > 5
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Media Service high latency"
      description: "Health check latency is {{ $value }}s"
```

## Troubleshooting

### Частые проблемы

**Health check возвращает 503:**
1. Проверить логи: `docker-compose logs backend`
2. Проверить статус сервисов: `docker-compose ps`
3. Проверить подключения к БД, MinIO, SQS

**Graceful shutdown не работает:**
1. Проверить, что используется SIGTERM, а не SIGKILL
2. Проверить логи на наличие сообщений о shutdown
3. Убедиться, что enableShutdownHooks() вызывается

**Worker не останавливается:**
1. Проверить, что stopPolling() вызывается
2. Проверить логи worker процесса
3. Убедиться, что нет зависших операций

### Отладка

**Проверка signal handlers:**
```bash
# Отправить SIGUSR1 для отладки (не завершает процесс)
docker kill --signal=SIGUSR1 <container_id>
```

**Мониторинг процессов:**
```bash
# Проверить процессы в контейнере
docker exec <container_id> ps aux

# Проверить открытые соединения
docker exec <container_id> netstat -an
```

## Критерии успешного тестирования

### Health Check
- ✅ Возвращает 200 при работающих сервисах
- ✅ Возвращает 503 при недоступных сервисах
- ✅ Корректный JSON формат ответа
- ✅ Время ответа < 5 секунд
- ✅ Все компоненты проверяются (DB, Storage, Queue)

### Graceful Shutdown
- ✅ SIGTERM корректно завершает приложение
- ✅ Логи содержат сообщения о shutdown
- ✅ Текущие запросы завершаются до shutdown
- ✅ DB соединения закрываются корректно
- ✅ Worker останавливает polling
- ✅ Процесс завершается с кодом 0

### Production Ready
- ✅ Kubernetes probes настроены
- ✅ Мониторинг и алерты работают
- ✅ Graceful shutdown < 30 секунд
- ✅ Нет потери данных при shutdown
- ✅ Rolling updates работают без downtime