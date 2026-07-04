# Monitoring Stack — Prometheus, Grafana, Loki/ELK

## Key Terms

* **Monitoring** (watch system health): metrics, logs, alerts, dashboards.
* **Observability** (understand unknown failures): logs + metrics + traces with context.
* **Metric** (number over time): CPU, memory, request count, latency.
* **Log** (event record): detailed text/JSON of what happened.
* **Trace** (request journey): path of one request across services.
* **Dashboard** (visual summary): Grafana panels for health and trends.
* **Alert** (notification on bad condition): tells team before users complain.
* **Alert fatigue** (too many noisy alerts): engineers start ignoring alerts.
* **Prometheus scrape** (pull metrics): Prometheus reads `/metrics` periodically.
* **PromQL** (Prometheus query language): used to calculate rates, percentiles, errors.
* **Loki** (log aggregation): stores/searches logs with labels.
* **ELK** (Elasticsearch, Logstash, Kibana): powerful full-text log search stack.

---

## Why Monitoring is Critical

**Without monitoring**:
* You find bugs from users
* No visibility into system health
* Can't diagnose issues quickly
* No capacity planning

**With monitoring**:
* Proactive issue detection
* Fast debugging
* Performance optimization
* Data-driven decisions

---

## The Monitoring Stack

```
Application
 ↓ (metrics)
Prometheus
 ↓ (visualization)
Grafana
 ↓ (logs)
Loki / ELK
```

---

## Prometheus — Metrics Collection

### What is Prometheus?

Prometheus is a **pull-based metrics system** that:
* Scrapes metrics from targets
* Stores time-series data
* Provides powerful query language (PromQL)
* Sends alerts

---

### How Prometheus Works

```
Prometheus Server
 ↓ (scrapes every 15s)
Application /metrics endpoint
```

**Pull-based**: Prometheus pulls metrics from your app (vs push-based like StatsD)

---

### Exposing Metrics (Node.js)

```javascript
const express = require('express');
const promClient = require('prom-client');

const app = express();

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000);
```

---

### Prometheus Configuration

**prometheus.yml**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['localhost:3000']
```

---

### PromQL (Query Language)

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, http_request_duration_seconds)

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# CPU usage
rate(process_cpu_seconds_total[5m]) * 100
```

---

## Grafana — Visualization

### What is Grafana?

Grafana is a **visualization and dashboarding tool** that:
* Connects to Prometheus (and other data sources)
* Creates beautiful dashboards
* Sends alerts
* Supports multiple data sources

---

### Setup Grafana

```bash
# Docker
docker run -d -p 3001:3000 --name grafana grafana/grafana
```

Access: `http://localhost:3001` (admin/admin)

---

### Add Prometheus Data Source

1. **Configuration → Data Sources → Add data source**
2. Select **Prometheus**
3. URL: `http://prometheus:9090`
4. Save & Test

---

### Create Dashboard

1. **Create → Dashboard → Add panel**
2. Query: `rate(http_requests_total[5m])`
3. Visualization: Graph
4. Save

---

### Common Dashboard Panels

#### 1. Request Rate
```promql
sum(rate(http_requests_total[5m])) by (route)
```

#### 2. Error Rate
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

#### 3. Response Time (p95)
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

#### 4. Memory Usage
```promql
process_resident_memory_bytes / 1024 / 1024
```

---

## Loki — Log Aggregation

### What is Loki?

Loki is a **log aggregation system** (like Prometheus, but for logs):
* Indexes labels, not full text
* Integrates with Grafana
* Lightweight and cost-effective

---

### Loki vs ELK

| Feature | Loki | ELK (Elasticsearch) |
| ------- | ---- | ------------------- |
| Indexing | Labels only | Full-text |
| Resource usage | Low | High |
| Query speed | Fast (labels) | Fast (full-text) |
| Cost | Low | High |
| Best for | Structured logs | Complex searches |

---

### Logging with Loki (Node.js)

```javascript
const winston = require('winston');
const LokiTransport = require('winston-loki');

const logger = winston.createLogger({
  transports: [
    new LokiTransport({
      host: 'http://loki:3100',
      labels: { app: 'my-app', env: 'production' },
      json: true
    })
  ]
});

// Use logger
logger.info('User logged in', { userId: 123 });
logger.error('Payment failed', { orderId: 456, error: 'Timeout' });
```

---

### Query Logs in Grafana

```logql
# All logs from my-app
{app="my-app"}

# Error logs only
{app="my-app"} |= "error"

# Logs with specific user
{app="my-app"} | json | userId="123"

# Rate of errors
rate({app="my-app"} |= "error" [5m])
```

---

## ELK Stack (Alternative)

### Components

1. **Elasticsearch**: Store and search logs
2. **Logstash**: Process and forward logs
3. **Kibana**: Visualize logs

---

### ELK vs Loki

Use **Loki** when:
* Cost-sensitive
* Structured logging
* Prometheus ecosystem

Use **ELK** when:
* Need full-text search
* Complex log queries
* Already using Elasticsearch

---

## Complete Monitoring Setup (Docker Compose)

**docker-compose.yml**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LOKI_HOST=http://loki:3100

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  loki:
    image: grafana/loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml

volumes:
  grafana-storage:
```

---

## What to Monitor

### Application Metrics
* Request rate
* Error rate
* Response time (p50, p95, p99)
* Active connections

### System Metrics
* CPU usage
* Memory usage
* Disk I/O
* Network I/O

### Business Metrics
* User signups
* Orders placed
* Revenue
* Active users

### Queue Metrics
* Queue length
* Processing time
* Failed jobs
* Retry count

---

## Alerting

### Prometheus Alerts

**alerts.yml**
```yaml
groups:
  - name: app_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} (threshold: 0.05)"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
```

### Grafana Alerts

1. **Create panel with query**
2. **Alert tab → Create alert**
3. **Set conditions** (e.g., value > 100)
4. **Configure notifications** (Slack, email, PagerDuty)

---

## Best Practices

✅ **Use labels wisely** (don't create too many unique combinations)
✅ **Monitor the 4 golden signals**: Latency, Traffic, Errors, Saturation
✅ **Set up alerts** for critical metrics
✅ **Create dashboards** for each service
✅ **Use structured logging** (JSON)
✅ **Correlate metrics and logs** (use trace IDs)
✅ **Monitor business metrics** (not just technical)

❌ Don't over-monitor (alert fatigue)
❌ Don't ignore alerts
❌ Don't log sensitive data

---

## Interview Questions

**Q: What is the difference between metrics and logs?**
A: Metrics are numerical data points (CPU, request count). Logs are event records (what happened, when, why).

**Q: Why is Prometheus pull-based?**
A: Easier service discovery, better control over scraping, and targets don't need to know about Prometheus.

**Q: What are the 4 golden signals?**
A: Latency, Traffic, Errors, Saturation (from Google SRE book).

**Q: When would you use Loki over ELK?**
A: When you want lower resource usage, simpler setup, and don't need full-text search.

---

## Summary

| Tool | Purpose |
| ---- | ------- |
| **Prometheus** | Collect metrics |
| **Grafana** | Visualize data |
| **Loki** | Aggregate logs (lightweight) |
| **ELK** | Aggregate logs (full-text search) |

**Key Insight**: You can't fix what you can't see. Monitoring is essential for production systems.
