# Health Checks with Spring Boot Actuator

## 1. Why Actuator?

In production, you need to know:
- Is the app up? (`/health`)
- Is the DB connected?
- How much RAM is used? (`/metrics`)
- What are the logs saying? (`/logfile`)

**Actuator** adds these endpoints automatically.

---

## 2. Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

---

## 3. Endpoints

By default, only `/actuator/health` is exposed.

### Expose Everything (Dev Only)
```properties
management.endpoints.web.exposure.include=*
```

### Expose Specifics (Prod)
```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
```

---

## 4. Custom Health Indicators

You can write your own checks (e.g., "Is the external API reachable?").

```java
@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        if (checkApi()) {
            return Health.up().build();
        }
        return Health.down().withDetail("Error", "API Unreachable").build();
    }

    private boolean checkApi() {
        // Ping google.com
        return true;
    }
}
```

Now `/actuator/health` will return `DOWN` if this check fails. Kubernetes will restart the pod.
