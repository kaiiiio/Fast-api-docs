# Structured Output with Java Records

## 1. The JSON Problem

LLMs output text. You want Objects.
"Give me a user" -> `{"name": "Alice", "age": 30}`

If the LLM adds a comma or misses a bracket, your JSON parser crashes.

---

## 2. Spring AI Output Parsers

Spring AI automatically converts LLM text to Java Beans/Records.

### The Record
```java
public record Actor(String name, List<String> movies) {}
```

### The Service
```java
@Service
public class MovieService {

    @Autowired
    private ChatClient chatClient;

    public Actor getActorInfo(String actorName) {
        BeanOutputParser<Actor> parser = new BeanOutputParser<>(Actor.class);
        
        String prompt = """
            Generate info for actor {actor}.
            {format}
            """;
            
        PromptTemplate template = new PromptTemplate(prompt);
        template.add("actor", actorName);
        template.add("format", parser.getFormat()); // Injects JSON schema instructions
        
        ChatResponse response = chatClient.call(template.create());
        
        return parser.parse(response.getResult().getOutput().getContent());
    }
}
```

**How it works**:
`parser.getFormat()` injects a hidden instruction:
*"Your output must be strictly valid JSON matching this schema..."*

---

## 3. Retry on Parse Error

If the LLM generates bad JSON, you can automatically feed the error *back* to the LLM and ask it to fix it.
Spring AI handles this in some implementations, or you can wrap it in a retry loop.
