# AI Call Retry and Circuit Breaking

## 1. The Problem

LLM APIs (OpenAI, Anthropic) are flaky.
- **Rate Limits (429)**: You sent too many tokens.
- **Overloaded (503)**: Their servers are melting.
- **Timeouts**: The model took 60s to generate a poem.

If you don't handle this, your app looks broken.

---

## 2. Resilience4j

The standard for fault tolerance in Java.

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
</dependency>
```

### Configuration (`application.yml`)
```yaml
resilience4j:
  retry:
    instances:
      openai:
        max-attempts: 3
        wait-duration: 2s
        enable-exponential-backoff: true
        retry-exceptions:
          - java.io.IOException
          - org.springframework.web.client.HttpServerErrorException
  circuitbreaker:
    instances:
      openai:
        failure-rate-threshold: 50
        minimum-number-of-calls: 5
        automatic-transition-from-open-to-half-open-enabled: true
        wait-duration-in-open-state: 10s
```

---

## 3. Usage

```java
@Service
public class AiService {

    @Autowired
    private OpenAiClient openAiClient;

    @Retry(name = "openai")
    @CircuitBreaker(name = "openai", fallbackMethod = "fallbackResponse")
    public String generateText(String prompt) {
        return openAiClient.complete(prompt);
    }

    public String fallbackResponse(String prompt, Throwable t) {
        return "AI is currently unavailable. Please try again later.";
    }
}
```

**Circuit Breaker Logic**:
1.  If 50% of calls fail, the circuit **Opens**.
2.  All subsequent calls fail *immediately* (Fast Fail) without hitting OpenAI.
3.  After 10s, it goes to **Half-Open** (lets 1 request through to test).
4.  If success, **Closed** (Normal). If fail, **Open**.
