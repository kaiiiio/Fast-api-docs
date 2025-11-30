# Distributed Tracing with Micrometer Tracing (formerly Sleuth)

## 1. The Microservices Problem

Service A calls Service B calls Service C.
Service C fails.
Service A returns 500.
You look at Service A logs. "Error calling B".
You look at Service B logs. "Error calling C".
You look at Service C logs. "NullPointerException".

Tracing connects these dots.

---

## 2. Setup (Spring Boot 3)

Spring Cloud Sleuth is replaced by **Micrometer Tracing**.

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

---

## 3. How it works

It adds headers to every HTTP request:
- `X-B3-TraceId`: Global ID for the whole chain.
- `X-B3-SpanId`: ID for the current step.

**Logs**:
`[UserService, 64f2a1, 89b1c2] - User not found`
- `64f2a1`: Trace ID (Search this in Zipkin/Grafana Tempo to see the full flow).
- `89b1c2`: Span ID.

---

## 4. Visualization (Zipkin)

Run Zipkin:
`docker run -d -p 9411:9411 openzipkin/zipkin`

Configure App:
```properties
management.tracing.sampling.probability=1.0 # Sample 100% (Dev only)
management.zipkin.tracing.endpoint=http://localhost:9411/api/v2/spans
```

Now you see a Gantt chart of your request:
- Service A (100ms)
  - Service B (50ms)
    - Service C (20ms)
