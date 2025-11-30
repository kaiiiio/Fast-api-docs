# Alerting on Data Pipeline Failures

## 1. The Silence is Deadly

If your background job fails silently, you might lose money for days.
You need **Proactive Alerting**.

---

## 2. Micrometer + Prometheus + AlertManager

Spring Boot Actuator exposes metrics.
Prometheus scrapes them.
AlertManager sends emails/Slack.

### Custom Metric
```java
@Component
public class JobMetrics {
    
    private final Counter failureCounter;

    public JobMetrics(MeterRegistry registry) {
        this.failureCounter = registry.counter("job.failures", "type", "import");
    }

    public void incrementFailure() {
        failureCounter.increment();
    }
}
```

### Prometheus Rule (YAML)
```yaml
groups:
- name: job-alerts
  rules:
  - alert: HighJobFailureRate
    expr: rate(job_failures_total[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Job failure rate is high"
```

---

## 3. Simple Slack Alerting (Logback)

If Prometheus is too complex, just log to Slack.

Use `logback-slack-appender`.

```xml
<appender name="SLACK" class="com.github.maricn.logback.SlackAppender">
    <webhookUri>https://hooks.slack.com/services/...</webhookUri>
    <layout class="ch.qos.logback.classic.PatternLayout">
        <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </layout>
</appender>

<root level="ERROR">
    <appender-ref ref="SLACK" />
</root>
```

Now every `log.error()` sends a Slack message.
**Warning**: Don't spam! Use this only for CRITICAL errors.
