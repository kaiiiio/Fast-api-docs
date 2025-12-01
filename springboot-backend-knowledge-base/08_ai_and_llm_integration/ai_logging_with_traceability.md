# AI Logging with Traceability

## 1. The "Black Box" Problem

Users complain: "The AI gave me a bad answer."
You check the logs: `Error: 500`.
You have NO IDEA what the prompt was or what the AI said.

You need **Full Traceability**:
- Input Prompt (with context).
- System Prompt.
- Model Parameters (Temperature).
- Output Response.
- Latency.

---

## 2. MDC (Mapped Diagnostic Context)

Add a `TraceID` to every log line.

```java
MDC.put("traceId", UUID.randomUUID().toString());
MDC.put("userId", user.getId());
// ... execute AI call ...
MDC.clear();
```

---

## 3. LangSmith / LangFuse Integration

For serious apps, use a dedicated LLM observability platform.
Spring AI supports these via callbacks.

But if building your own:

```java
public class LoggingAdvisor implements RequestAwareAdvisor {

    @Override
    public AdvisedRequest adviseRequest(AdvisedRequest request, Map<String, Object> context) {
        log.info("AI Request: Model={}, Prompt={}", request.chatOptions().getModel(), request.userText());
        return request;
    }
}
```

---

## 4. Privacy Redaction

**Critical**: Do NOT log PII (Passwords, SSNs) sent to the AI.
Use a regex filter before logging.

```java
private String redact(String input) {
    return input.replaceAll("\\b\\d{3}-\\d{2}-\\d{4}\\b", "***-**-****"); // SSN
}
```
