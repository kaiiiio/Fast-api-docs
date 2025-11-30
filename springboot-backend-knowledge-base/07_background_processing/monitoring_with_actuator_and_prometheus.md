# Monitoring with Actuator and Prometheus

## 1. The "Silent Failure"

Background jobs are invisible. If they fail, no user sees a 500 error.
You MUST monitor them.

---

## 2. Exposing Metrics

Use `Micrometer` to track job stats.

```java
@Service
public class JobService {

    private final Counter successCounter;
    private final Counter failureCounter;
    private final Timer jobTimer;

    public JobService(MeterRegistry registry) {
        this.successCounter = registry.counter("jobs.execution", "status", "success");
        this.failureCounter = registry.counter("jobs.execution", "status", "failure");
        this.jobTimer = registry.timer("jobs.duration");
    }

    @Scheduled(fixedRate = 60000)
    public void runJob() {
        jobTimer.record(() -> {
            try {
                // ... work ...
                successCounter.increment();
            } catch (Exception e) {
                failureCounter.increment();
            }
        });
    }
}
```

---

## 3. Prometheus Queries

**Rate of Failures**:
`rate(jobs_execution_total{status="failure"}[5m])`

**Average Duration**:
`rate(jobs_duration_seconds_sum[5m]) / rate(jobs_duration_seconds_count[5m])`

---

## 4. Health Checks

Add a custom Actuator Health Indicator.
If the "Last Successful Job" was > 1 hour ago, report DOWN.

```java
@Component
public class JobHealthIndicator implements HealthIndicator {
    
    private LocalDateTime lastSuccess = LocalDateTime.now();

    public void markSuccess() {
        this.lastSuccess = LocalDateTime.now();
    }

    @Override
    public Health health() {
        if (lastSuccess.isBefore(LocalDateTime.now().minusHours(1))) {
            return Health.down().withDetail("error", "Job hasn't run in 1 hour").build();
        }
        return Health.up().build();
    }
}
```
