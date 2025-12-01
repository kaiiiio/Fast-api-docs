# Prompt Versioning and A/B Testing

## 1. The "Magic String" Problem

Hardcoding prompts in Java strings is bad.
`String prompt = "You are a helpful assistant..."`

- You can't change it without redeploying.
- You can't test Version A vs Version B.
- Non-technical people (PMs) can't edit it.

---

## 2. Solution: External Templates

Store prompts in `src/main/resources/prompts/` or a Database.

### Spring AI Template
```java
Resource resource = new ClassPathResource("prompts/joke.st");
PromptTemplate template = new PromptTemplate(resource);
Prompt prompt = template.create(Map.of("topic", "cows"));
```

`joke.st`:
```text
Tell me a funny joke about {topic}.
```

---

## 3. A/B Testing

1.  Store prompts in a DB table `Prompts`.
    - `id`: "joke-generator"
    - `version`: "v1"
    - `content`: "Tell me a joke..."
    - `active`: true

2.  **Traffic Splitting**:
    - 50% of users get v1.
    - 50% of users get v2 ("Tell me a sarcastic joke...").

3.  **Measure**:
    - Which version got more "Thumbs Up"?
    - Which version had lower latency?

---

## 4. Prompt Registry

For enterprise, use a Prompt Registry (like a Docker Registry, but for prompts).
- **LangSmith Hub**
- **Pezzo**

Your app pulls the latest prompt at runtime.
