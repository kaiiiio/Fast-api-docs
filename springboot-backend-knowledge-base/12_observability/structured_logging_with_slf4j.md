# Structured Logging with SLF4J

## 1. Text vs JSON

**Text Logs**:
`2023-10-27 10:00:00 INFO User Alice logged in from 192.168.1.1`
- Hard to parse.
- Hard to search "All logins from IP X".

**JSON Logs (Structured)**:
```json
{
  "timestamp": "2023-10-27T10:00:00Z",
  "level": "INFO",
  "message": "User logged in",
  "user": "Alice",
  "ip": "192.168.1.1"
}
```
- Easy to index in Elasticsearch / Splunk.

---

## 2. Logstash Encoder

Add dependency:
```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

Configure `logback-spring.xml`:
```xml
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON" />
    </root>
</configuration>
```

---

## 3. Adding Context (MDC)

Don't concatenate strings.
`log.info("User " + user + " logged in")` -> **BAD**

Use MDC (Mapped Diagnostic Context) or Structured Arguments.

```java
import static net.logstash.logback.argument.StructuredArguments.kv;

log.info("User logged in", kv("user", "Alice"), kv("ip", "192.168.1.1"));
```

This ensures `user` and `ip` become *fields* in the JSON, not just part of the message string.
