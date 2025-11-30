# AI Cost Tracking

## 1. Why Track Costs?

GPT-4 is expensive. If you have a bug in a loop, you can burn $1000 in 5 minutes.
You need to track token usage **per user** and **per feature**.

---

## 2. The Model

```java
@Entity
public class AiUsageLog {
    @Id
    @GeneratedValue
    private Long id;
    
    private String userId;
    private String feature; // "resume-parser", "chatbot"
    private String model;   // "gpt-4"
    
    private int promptTokens;
    private int completionTokens;
    private double cost; // Calculated based on model pricing
    
    private LocalDateTime timestamp;
}
```

---

## 3. Implementation (Aspect Oriented Programming)

Don't clutter your business logic with logging code. Use an **Aspect**.

```java
@Aspect
@Component
public class CostTrackingAspect {

    @Autowired
    private UsageRepository repository;

    @AfterReturning(pointcut = "execution(* com.example.AiService.generate(..))", returning = "response")
    public void logCost(JoinPoint joinPoint, OpenAiResponse response) {
        
        int prompt = response.getUsage().getPromptTokens();
        int completion = response.getUsage().getCompletionTokens();
        double cost = calculateCost(prompt, completion, response.getModel());
        
        AiUsageLog log = new AiUsageLog();
        log.setPromptTokens(prompt);
        log.setCompletionTokens(completion);
        log.setCost(cost);
        // ... set user from SecurityContext
        
        repository.save(log);
    }
}
```

---

## 4. Hard Limits

Implement a quota system.
1.  Check `SUM(cost)` for user in current month.
2.  If `> $10.00`, throw `QuotaExceededException`.
