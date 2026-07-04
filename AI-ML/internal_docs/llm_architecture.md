
# Large Language Models (LLMs) — Architecture & Practical Use

This file explains, in concrete terms, how transformer-based LLMs work and what matters when you call them from a RAG pipeline. Expect short code examples and rules of thumb.

1) Transformers at a glance
- Transformers use self-attention: every token can attend to other tokens with learned weights. This lets the model capture long-range dependencies.
- Typical LLMs are decoder-only (predict next token autoregressively). Encoder-decoder models are common in sequence-to-sequence tasks.

2) Tokens and tokenization (practical)
- A tokenizer converts text -> tokens (subword pieces). "hello" might be one token, "unbelievable" might be split into pieces.
- Token counts determine cost and whether text fits in the model's context window. Use tokenizer utilities from the model provider to measure tokens before sending.

Example (pseudo):

```javascript
// Pseudo-code: measure tokens
const tokens = tokenizer.encode(prompt);
if (tokens.length > modelContextSize) throw new Error('prompt too long');
```

3) Context window and prompt design
- The context window is the maximum number of tokens the model accepts. If prompt+context > window, the call will fail or be truncated.
- In RAG, include only the most relevant chunks; prefer top-K = 1..5 for short prompts, up to 10 for detailed answers.

4) Sampling and determinism — when to tune
- Temperature: 0 for deterministic answers (best for factual Q&A); 0.7 for creative outputs.
- Top-k/top-p: control diversity. For factual tasks you typically use low temperature and maybe disable top-p.

5) Tokens, cost, and latency
- Cost often scales with token count. Minimizing prompt size reduces cost.
- Latency includes network round-trips and model processing time; batching and caching help.

6) Safety, rate-limiting, and retries
- Implement retries with exponential backoff for rate limits.
- Sanitize user input and redact sensitive data when sending to third-party APIs.

7) How an LLM is used in RAG (example flow)
- Step 1: Retrieve top-K chunks using embeddings.
- Step 2: Compose a prompt with 1–K chunks and the user question. Example:

```
Context from fileX.txt:

<chunk text>

Question: <user question>

Answer based only on the context above:
```

- Step 3: Call the model with temperature=0 and low max_tokens for concise factual answers.

8) Prompt engineering tips
- Put instructions at the top, examples if helpful, and clearly delimit context from question.
- Avoid overloading the prompt with many long chunks; prefer concise, high-quality context.

Next: read `rag_overview.md` to see how retrieval and generation are combined end-to-end.
