# LLM APIs in Production

> Module: AI Engineering | Level: Senior/Staff | FDE Interview Prep

This module covers the production layer of LLM engineering: what a Forward Deployed Engineer actually builds when an LLM API meets a customer environment. You already know tokens, embeddings, and transformers — here we focus on structured output that never corrupts a database, tool loops that don't spin forever, streaming that feels instant, caching that cuts bills by 90%, and retry logic that doesn't turn an outage into a storm. Patterns are provider-agnostic; concrete examples use the Claude API (`@anthropic-ai/sdk`) as primary and OpenAI as secondary.

---

## Structured Output

### Q1. You need an LLM to return JSON that feeds a database. What are your options, and when do you use which?

**Answer:**

There are two production-grade mechanisms, plus one legacy hack you should name (and reject) in an interview:

| Approach | How | Guarantees | Use when |
|---|---|---|---|
| **JSON schema output mode** | Claude: `output_config: { format: { type: "json_schema", schema } }`; OpenAI: `response_format: { type: "json_schema", json_schema: { ..., strict: true } }` | Output text is valid JSON matching the schema (constrained decoding) | The *entire response* is the structured artifact: extraction, classification, form filling |
| **Tool-forced extraction** | Define a tool whose `input_schema` is your target shape; force it with `tool_choice: { type: "tool", name: "extract" }`; set `strict: true` on the tool | `tool_use.input` validates against the schema | You're already in a tool-calling loop, or you want extraction to coexist with the model optionally doing something else |
| **Prompt-and-pray** ("respond ONLY with JSON") | System prompt begging | None | Never in production. Legacy models without native schema support only — and then always behind a validator + retry loop (Q3) |

Claude-side JSON schema mode, concretely:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const ticketSchema = {
  type: "object",
  properties: {
    category: { type: "string", enum: ["billing", "bug", "feature_request", "other"] },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    summary: { type: "string" },
    customer_email: { type: "string", format: "email" },
  },
  required: ["category", "severity", "summary", "customer_email"],
  additionalProperties: false, // REQUIRED — schema is rejected without it
} as const;

const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  output_config: { format: { type: "json_schema", schema: ticketSchema } },
  messages: [
    { role: "user", content: `Extract ticket fields from: ${rawTicketText}` },
  ],
});

const text = response.content.find((b) => b.type === "text");
const ticket = JSON.parse(text!.type === "text" ? text!.text : "{}");
```

Two schema rules the API enforces: every object needs `additionalProperties: false`, and every object needs `required`. Recursive schemas and numeric range constraints (`minimum`/`maxLength`) are unsupported — enforce those client-side with Zod.

Tool-forced extraction, when you want the tool path:

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  tools: [
    {
      name: "record_ticket",
      description: "Record a structured support ticket extracted from raw text.",
      strict: true, // top-level field on the tool — guarantees input validates
      input_schema: ticketSchema,
    },
  ],
  tool_choice: { type: "tool", name: "record_ticket" }, // force this tool
  messages: [{ role: "user", content: rawTicketText }],
});

const toolUse = response.content.find((b) => b.type === "tool_use");
const ticket = toolUse?.type === "tool_use" ? toolUse.input : null;
```

**Interview trap:** Candidates often say "just prefill the assistant turn with `{`". On current Claude models (Sonnet 5, Opus 4.8, the 4.6+ family) assistant prefill returns a **400** — it was removed precisely because schema mode replaced it. Mentioning prefill as your primary strategy dates your knowledge by two model generations.

---

### Q2. If the API guarantees schema-valid output, why does invalid JSON still happen in production?

**Answer:**

The guarantee has edges, and the edges are exactly where production incidents live:

1. **`max_tokens` truncation.** Constrained decoding guarantees each emitted token keeps the output *prefix-valid* — it does not guarantee the model finishes. If `stop_reason === "max_tokens"`, you have a syntactically incomplete JSON document that was "valid so far." Detection is trivial and mandatory:

```typescript
if (response.stop_reason === "max_tokens") {
  // Do NOT JSON.parse and hope. Retry with a larger budget or fail loudly.
  throw new TruncatedOutputError(response.usage.output_tokens);
}
```

2. **Refusals.** A safety refusal (`stop_reason === "refusal"` on current models) produces no schema-conforming output at all. Check `stop_reason` before touching `content`.

3. **Models/providers without native schema support.** Fallback models, older snapshots, or a gateway silently routing to a different provider can drop the constraint. Your parsing layer must not assume the constraint held.

4. **Schema-valid but semantically wrong.** `"customer_email": "n/a"` passes `type: "string"` (the API's `format: "email"` support is limited and your client-side rules are usually stricter). The API validates *shape*; Zod validates *meaning* (refinements, cross-field checks).

```
                     Where "valid JSON" breaks down
  ┌────────────────────────────────────────────────────────────┐
  │ constrained decoding coverage                              │
  │  ┌──────────────────────────────────────────┐              │
  │  │ syntactically valid + schema-shaped      │  refusal ────┼── no output
  │  │                                          │              │
  │  │   semantic errors still possible ────────┼── Zod layer  │
  │  └───────────────────────────────┬──────────┘              │
  │                                  └── max_tokens cut ───────┼── partial doc
  └────────────────────────────────────────────────────────────┘
```

The production stance: treat the API constraint as a *strong prior*, not a contract. Always parse through a validator, always branch on `stop_reason`.

**Interview trap:** "Structured output means I can skip validation" is the answer that fails senior loops. The correct framing is defense in depth — API-level constraint for the happy path, Zod at the boundary, retry-with-feedback for the residual, dead-letter for the unfixable.

---

### Q3. Implement a complete parse → validate → retry-with-feedback → dead-letter pipeline in TypeScript.

**Answer:**

The pattern: define the schema once in Zod, derive the JSON Schema for the API, and on validation failure feed the *specific* Zod errors back to the model as a follow-up message. Bounded retries; anything that survives them goes to a dead-letter queue for humans.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z, ZodError } from "zod";

const client = new Anthropic();

// 1. Single source of truth: Zod schema with semantic rules the API can't express
const TicketSchema = z.object({
  category: z.enum(["billing", "bug", "feature_request", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().min(10).max(500),
  customer_email: z.string().email(),
});
type Ticket = z.infer<typeof TicketSchema>;

// 2. zodToJsonSchema-style conversion, restricted to API-supported keywords.
//    (In real code use the `zod-to-json-schema` package; this shows the shape
//    and the constraint-stripping you must do either way.)
function ticketJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      category: { type: "string", enum: ["billing", "bug", "feature_request", "other"] },
      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
      // min/max length are NOT supported by the API — enforced by Zod only
      summary: { type: "string", description: "10-500 chars" },
      customer_email: { type: "string", description: "A valid email address" },
    },
    required: ["category", "severity", "summary", "customer_email"],
    additionalProperties: false,
  };
}

interface DeadLetter {
  input: string;
  attempts: number;
  lastError: string;
  timestamp: string;
}
const deadLetterQueue: DeadLetter[] = []; // in prod: SQS/Kafka/DB table

function formatZodError(err: ZodError): string {
  return err.issues
    .map((i) => `- field "${i.path.join(".")}" : ${i.message}`)
    .join("\n");
}

export async function extractTicket(
  rawText: string,
  maxAttempts = 3,
): Promise<Ticket | null> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Extract the support ticket fields from:\n\n${rawText}` },
  ];
  let lastError = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      output_config: { format: { type: "json_schema", schema: ticketJsonSchema() } },
      messages,
    });

    // Edge 1: truncation — retrying with the same budget will truncate again
    if (response.stop_reason === "max_tokens") {
      lastError = `truncated at ${response.usage.output_tokens} output tokens`;
      break; // dead-letter; a code change (bigger max_tokens) is needed, not a retry
    }
    // Edge 2: refusal — no structured content exists
    if (response.stop_reason === "refusal") {
      lastError = "model refused";
      break;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const rawJson = textBlock?.type === "text" ? textBlock.text : "";

    try {
      return TicketSchema.parse(JSON.parse(rawJson)); // success path
    } catch (err) {
      lastError = err instanceof ZodError ? formatZodError(err) : String(err);
      // 3. Feedback loop: append the failing output + the exact validation
      //    errors so the model can self-correct instead of guessing again.
      messages.push(
        { role: "assistant", content: rawJson },
        {
          role: "user",
          content:
            `Your previous output failed validation:\n${lastError}\n` +
            `Return the corrected JSON only.`,
        },
      );
    }
  }

  // 4. Dead-letter: bounded retries exhausted or non-retryable edge hit
  deadLetterQueue.push({
    input: rawText,
    attempts: maxAttempts,
    lastError,
    timestamp: new Date().toISOString(),
  });
  return null;
}
```

Design points worth saying out loud in an interview: the feedback message contains the *field-level* errors (a bare "invalid, try again" barely improves the retry); truncation and refusal skip the retry loop because retrying can't fix them; and the dead-letter record carries the last error so on-call can triage without re-running the pipeline.

**Production war story:** A team extracting invoice line items saw a 0.4% "random" parse-failure rate that resisted prompt tuning. Root cause: their `max_tokens` was sized for the *median* invoice, and the p99 invoice had 300 line items. Every failure had `stop_reason: "max_tokens"` — visible in logs from day one, checked by no one. One line of stop-reason branching would have converted two weeks of prompt archaeology into a five-minute config change.

---

## Function/Tool Calling

### Q4. Walk through the anatomy of a tool-calling loop, then implement a production `runToolLoop()` from scratch.

**Answer:**

The wire protocol, provider-agnostic in shape:

```
  ┌──────────┐  1. messages + tool defs          ┌─────────┐
  │  Your    │ ────────────────────────────────► │  Model  │
  │  code    │                                   │         │
  │          │  2. stop_reason: "tool_use"       │         │
  │          │ ◄──────────────────────────────── │         │
  │          │     content: [tool_use, tool_use] │         │
  │          │                                   │         │
  │ execute  │  3. ONE user msg with ALL         │         │
  │ tools    │     tool_result blocks            │         │
  │ (parallel)│ ───────────────────────────────► │         │
  │          │                                   │         │
  │          │  4. repeat until "end_turn"       │         │
  └──────────┘ ◄──────────────────────────────── └─────────┘
```

Claude specifics: the assistant message may contain **multiple** `tool_use` blocks (parallel tool use is on by default); you reply with a **user** message whose content is `tool_result` blocks (`{ type: "tool_result", tool_use_id, content, is_error? }`); OpenAI's equivalent is a `tool_calls` array on the assistant message answered by `role: "tool"` messages.

Complete implementation:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

type ToolHandler = (input: Record<string, unknown>) => Promise<string>;

interface RegisteredTool {
  definition: Anthropic.Tool;
  handler: ToolHandler;
}

// Tool registry: definition + executable side by side, keyed by name
const registry = new Map<string, RegisteredTool>();

registry.set("get_order_status", {
  definition: {
    name: "get_order_status",
    description:
      "Look up the current status of a customer order by its order ID. " +
      "Call this whenever the user asks where their order is or mentions an order number.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { order_id: { type: "string", description: "e.g. ORD-12345" } },
      required: ["order_id"],
      additionalProperties: false,
    },
  },
  handler: async (input) => {
    const status = await orderService.status(String(input.order_id));
    return JSON.stringify(status);
  },
});

registry.set("refund_order", {
  definition: {
    name: "refund_order",
    description:
      "Issue a refund for an order. Call ONLY after get_order_status confirms " +
      "the order is refundable. Irreversible.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["order_id", "reason"],
      additionalProperties: false,
    },
  },
  handler: async (input) =>
    JSON.stringify(await refundService.issue(String(input.order_id), String(input.reason))),
});

export async function runToolLoop(
  userMessage: string,
  maxIterations = 10,
): Promise<string> {
  const tools = [...registry.values()].map((t) => t.definition);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      tools,
      messages,
    });

    // Always append the FULL assistant content (text + tool_use blocks).
    // Dropping the text blocks corrupts the transcript the model reasons over.
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const text = response.content.find((b) => b.type === "text");
      return text?.type === "text" ? text.text : "";
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    // Execute all requested tools CONCURRENTLY. allSettled: one tool failing
    // must not throw away the others' results.
    const settled = await Promise.allSettled(
      toolUses.map(async (tu) => {
        const tool = registry.get(tu.name);
        if (!tool) throw new Error(`unknown tool: ${tu.name}`);
        return tool.handler(tu.input as Record<string, unknown>);
      }),
    );

    // Failures become is_error tool_results — the model recovers or explains;
    // throwing here would kill the whole conversation over one flaky API.
    const results: Anthropic.ToolResultBlockParam[] = settled.map((s, idx) => ({
      type: "tool_result",
      tool_use_id: toolUses[idx].id,
      content: s.status === "fulfilled" ? s.value : `Error: ${String(s.reason)}`,
      is_error: s.status === "rejected" ? true : undefined,
    }));

    // ALL results in ONE user message — the one-user-message rule.
    messages.push({ role: "user", content: results });
  }

  throw new Error(`tool loop exceeded ${maxIterations} iterations`);
}
```

Every element earns its place: the registry keeps definition and handler from drifting; `Promise.allSettled` + `is_error` makes tool failure a *model-visible event* instead of a crash; `maxIterations` bounds a model that gets stuck calling the same tool; and appending `response.content` wholesale preserves the interleaved reasoning text.

**Interview trap:** Splitting `tool_result` blocks across multiple user messages "because each tool finished at a different time." The API accepts it — and then the model quietly learns from the transcript that tools resolve serially, and **stops issuing parallel calls** in future turns. Batch every result for one assistant turn into one user message, always.

---

### Q5. What is the single highest-leverage thing you can do to improve tool-calling accuracy?

**Answer:**

Write better tool descriptions. Not fine-tuning, not few-shot examples, not more `maxIterations` — the description field is the model's only manual for your tool, and it is read on every single turn.

The pattern that works: **what it does + when to call it + when NOT to + what the arguments mean operationally.**

```typescript
// Weak — the model will both under- and over-trigger this:
{ name: "search", description: "Search the knowledge base" }

// Strong:
{
  name: "search_kb",
  description:
    "Full-text search over the customer's internal support knowledge base. " +
    "Call this when the user asks about product behavior, configuration, or " +
    "policies — do not answer such questions from memory. Do NOT call it for " +
    "chit-chat or questions about this conversation. Returns the top 5 " +
    "articles as JSON. Query works best as 3-8 keywords, not a full sentence.",
  ...
}
```

Secondary levers, in descending order of impact:

1. **`strict: true`** on every tool — eliminates malformed-argument retries entirely (guaranteed schema-valid `input`).
2. **Per-property descriptions and enums** in `input_schema` — an `enum` beats three sentences of prose about allowed values.
3. **Forcing `tool_choice`** when the workflow demands it: `{ type: "tool", name }` for "this turn MUST extract," `{ type: "any" }` for "must use *some* tool," `{ type: "auto" }` (default) otherwise. Force only at workflow chokepoints — a forced tool on every turn turns your agent into a rigid pipeline and you lose the model's judgment about when the tool is wrong.
4. **Fewer tools.** Fifteen overlapping tools cause selection errors that no description fixes. Merge or namespace.

**Production war story:** An FDE deployment had a `create_jira_ticket` tool firing on roughly a third of turns — users venting ("this is so broken") got tickets filed. No prompt-level "be careful" fixed it. Changing the description from "Create a Jira ticket for an issue" to "Create a Jira ticket. Call ONLY when the user explicitly asks to file, track, or escalate an issue — never for general complaints or questions" dropped false triggers by ~90% overnight. One sentence; no code change.

---

### Q6. How do parallel tool calls actually arrive, and how do you handle partial failure across them?

**Answer:**

One assistant message can carry N `tool_use` blocks — e.g. the user asks "compare the weather in Paris, London, and Tokyo" and you get three `get_weather` calls in a single response. Your obligations:

1. **Execute concurrently** (they were requested together because they're independent).
2. **Return one `tool_result` per `tool_use_id`** — the API rejects the follow-up if any ID lacks a matching result.
3. **All results in one user message** (see Q4's trap).
4. **Failures become `is_error: true` results, not exceptions.** The model then decides: retry, work around it, or tell the user.

The `Promise.allSettled` pattern from Q4 is the load-bearing piece. `Promise.all` is a bug here: if the Tokyo weather API times out, `Promise.all` rejects, you lose Paris and London (already fetched), and you either crash or return an incomplete result set that the API will 400 on.

Error result content should be *useful to the model*:

```typescript
{
  type: "tool_result",
  tool_use_id: tu.id,
  content: "Error: weather API timeout after 5000ms for city=Tokyo. " +
           "The service may be degraded; you can retry once or proceed " +
           "with the other cities and note the gap.",
  is_error: true,
}
```

A bare `"Error"` string wastes the recovery opportunity; a stack trace leaks internals and burns tokens. One sentence of what failed plus one of what's possible next is the sweet spot.

If a tool must never run in parallel with others (a mutating action with ordering constraints), set `disable_parallel_tool_use: true` inside `tool_choice` — but reach for that only when true serialization is required, since it costs a round trip per call.

---

## Streaming

### Q7. Why does streaming matter, and what exactly comes over the wire?

**Answer:**

Two different latencies govern perceived speed: **TTFT** (time to first token) and **total latency**. A 20-second response with 500ms TTFT *feels* responsive — the user reads as the model writes. The same response non-streaming feels broken; most users assume failure after ~5 seconds of spinner. Streaming doesn't make the model faster; it moves all the waiting to where the user can't perceive it. It also protects long generations from HTTP timeouts (SDKs refuse very large `max_tokens` on non-streaming calls for this reason).

The wire format is Server-Sent Events. Claude's event sequence:

```
event: message_start          ← message id, model, initial usage
event: content_block_start    ← block 0 begins (type: text | tool_use | thinking)
event: content_block_delta    ← repeated; delta.type is one of:
                                  text_delta        (response text)
                                  input_json_delta  (streamed tool arguments)
                                  thinking_delta    (reasoning stream)
event: content_block_stop     ← block 0 done
  ... more blocks ...
event: message_delta          ← stop_reason + final usage arrive HERE
event: message_stop           ← stream end
```

Two facts interviewers probe: `stop_reason` and output-token usage arrive on `message_delta`, near the end — you cannot know why the model stopped until the stream is nearly done; and tool arguments stream as `input_json_delta` fragments of a JSON string, which is why partial-JSON parsing (Q9) exists.

SDK consumption (the normal path):

```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-5",
  max_tokens: 4096,
  messages: [{ role: "user", content: "Explain BGP route flapping." }],
});

stream.on("text", (delta) => process.stdout.write(delta));

const final = await stream.finalMessage(); // complete Message: usage, stop_reason
console.log(`\n[${final.usage.output_tokens} output tokens, ${final.stop_reason}]`);
```

And the raw-SSE path you need when there's no SDK (embedded runtimes, exotic gateways):

```typescript
async function streamRaw(prompt: string): Promise<void> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; a frame may span TCP chunks,
    // so keep the trailing partial frame in the buffer.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(6));
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        process.stdout.write(event.delta.text);
      }
      if (event.type === "message_delta") {
        console.log(`\n[stop_reason: ${event.delta.stop_reason}]`);
      }
    }
  }
}
```

The buffer-and-split-on-`\n\n` dance is the part hand-rolled implementations get wrong: TCP chunk boundaries do not respect SSE frame boundaries.

---

### Q8. Design the server → browser relay for a streaming chat product, including the buffering strategy.

**Answer:**

You never expose the provider API key to the browser, so the topology is always a relay:

```
  Browser ◄── SSE / fetch-stream ── Your server ◄── SDK stream ── Claude API
           (your auth, your shape)              (API key lives here)
```

Server side — a route handler that adapts the SDK stream into a `ReadableStream` (the Vercel-AI-style pattern, framework-free):

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request): Promise<Response> {
  const { messages } = (await req.json()) as {
    messages: Anthropic.MessageParam[];
  };

  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: 4096,
          messages,
        });
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            // Re-frame as your own SSE protocol — decoupled from provider shape
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ t: event.delta.text })}\n\n`,
              ),
            );
          }
        }
        const final = await stream.finalMessage();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, usage: final.usage })}\n\n`,
          ),
        );
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
```

Browser side, with the buffering strategy that matters: the model emits deltas faster than 60fps rendering deserves, and setting React state (or touching the DOM) per token causes layout thrash and a janky stream. **Accumulate deltas in a ref; flush to the DOM on a ~50ms timer or `requestAnimationFrame`.**

```typescript
export async function consumeChat(
  url: string,
  messages: unknown[],
  onFlush: (fullText: string) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  let accumulated = "";
  let dirty = false;
  const timer = setInterval(() => {
    if (dirty) {
      onFlush(accumulated); // ONE render per tick, not one per token
      dirty = false;
    }
  }, 50);

  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (!frame.startsWith("data: ")) continue;
        const msg = JSON.parse(frame.slice(6));
        if (msg.t) {
          accumulated += msg.t;
          dirty = true;
        }
      }
    }
  } finally {
    clearInterval(timer);
    onFlush(accumulated); // final flush
  }
}
```

Relay design points: re-frame provider events into your own minimal protocol (so a provider migration doesn't break every client); send usage in the terminal frame (billing/analytics need it and it only exists at stream end); and keep the abort path wired — a user closing the tab should cancel the upstream request, not let it bill to completion.

**Production war story:** A customer-facing copilot shipped with `setState` per token. On short answers it looked fine; on a 3,000-token answer, React reconciled ~3,000 times in 40 seconds and low-end laptops pinned a core — users reported the *page* freezing and blamed the model. The 50ms flush timer fixed it in an afternoon: same stream, ~800 renders became ~80, and "the model feels slow" tickets stopped.

---

### Q9. Tool arguments and structured output arrive as partial JSON while streaming. How do you render them before the JSON is complete?

**Answer:**

During streaming, `input_json_delta` gives you fragments of a JSON string: `{"quer` … `y": "rout` … `er config"}`. If you want live UI ("Searching for: router config…") you must parse JSON that isn't finished yet. The approach is best-effort **repair**: track what's structurally open, close it, parse the repaired string, render, repeat on the next delta.

```typescript
/**
 * Best-effort partial JSON parser: repairs an incomplete JSON prefix by
 * closing open strings/objects/arrays, then parses. Returns null until
 * the prefix first becomes repairable.
 */
export function parsePartialJson(partial: string): unknown | null {
  const trimmed = partial.trimStart();
  if (trimmed === "") return null;

  let inString = false;
  let escaped = false;
  const stack: Array<"}" | "]"> = [];

  for (const ch of trimmed) {
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let repaired = trimmed;
  if (escaped) repaired = repaired.slice(0, -1); // drop dangling backslash
  if (inString) repaired += '"';
  // Trim a trailing comma or colon that would make the close invalid:
  repaired = repaired.replace(/[,:]\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) repaired += stack[i];

  try {
    return JSON.parse(repaired);
  } catch {
    return null; // not yet repairable — wait for more deltas
  }
}

// Wiring it into a stream, per tool_use block index:
const argBuffers = new Map<number, string>();

for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
    const soFar = (argBuffers.get(event.index) ?? "") + event.delta.partial_json;
    argBuffers.set(event.index, soFar);
    const preview = parsePartialJson(soFar) as { query?: string } | null;
    if (preview?.query) ui.showToolPreview(`Searching: ${preview.query}`);
  }
  if (event.type === "content_block_stop") {
    // NOW parse strictly — execution must never run on repaired JSON
    const complete = JSON.parse(argBuffers.get(event.index) ?? "{}");
    void complete;
  }
}
```

The invariant to state explicitly: **repaired JSON is for display only.** Tool execution and database writes wait for `content_block_stop` and a strict `JSON.parse`. A repaired `{"amount": 1}` might be a truncated `{"amount": 1000}` — rendering that is cosmetic; executing it is an incident. The same parser serves streamed structured output (schema mode + streaming) for progressive form-fill UIs.

**Interview trap:** "I'd just try/catch `JSON.parse` on every delta and use the last one that parsed." That yields *no* successful parse until the very last token for most objects (the string is invalid the entire time), so your "streaming" UI renders nothing and then everything — congratulations, you rebuilt non-streaming with more code.

---

## Prompt Caching

### Q10. How does prompt caching work mechanically, and what's the cost math?

**Answer:**

Prompt caching lets the API skip re-computing the transformer prefill over bytes it has recently seen. The mechanics, which drive everything else:

- **Strict prefix match** over the rendered order **tools → system → messages**. The cache key is the exact bytes up to a breakpoint. One changed byte at position N invalidates everything at positions ≥ N.
- You mark breakpoints with `cache_control: { type: "ephemeral" }` on content blocks (system blocks, tool definitions, message blocks) — max **4** per request — or use top-level auto-caching to mark the last cacheable block.
- **Pricing:** cache *writes* cost 1.25× base input (5-minute TTL) or 2× (1-hour TTL via `ttl: "1h"`); cache *reads* cost **0.1×**.
- **Minimum cacheable prefix** is ~1024–4096 tokens depending on model; shorter prefixes silently don't cache (no error — just `cache_creation_input_tokens: 0`).
- Verify via `usage.cache_read_input_tokens` / `usage.cache_creation_input_tokens`. Zero reads across identical-prefix requests means a silent invalidator (Q11).

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 2048,
  system: [
    {
      type: "text",
      text: FIFTY_K_TOKEN_PLAYBOOK, // stable: product docs, policies, examples
      cache_control: { type: "ephemeral" }, // breakpoint at end of stable prefix
    },
  ],
  messages: [{ role: "user", content: userQuestion }], // volatile: after breakpoint
});
console.log(response.usage.cache_read_input_tokens); // expect ~50K on request #2+
```

**Worked example** — 50K-token system+tools prefix, 500 requests/day, `claude-sonnet-5` ($3/M input), steady traffic keeping the 5-min cache warm:

```
Uncached:  500 req × 50,000 tok × $3.00/M            = $75.00/day
Cached:    1 write   × 50,000 × $3.75/M  = $0.19     (1.25× write premium)
           499 reads × 50,000 × $0.30/M  = $7.49     (0.1× read rate)
                                          ≈ $7.68/day
Savings:   ~90% on the prefix → ~$2,020/month at this volume
```

Break-even at 5-min TTL is **two requests**: 1.25× + 0.1× = 1.35× vs 2× uncached. (1-hour TTL writes cost 2×, so break-even moves to three requests — use it for bursty traffic with >5-minute gaps.) Caching also cuts latency: cached prefill is far faster, so TTFT on a 50K prefix drops from seconds to sub-second.

**Interview trap:** "Caching saves money, so cache everything." A per-request-unique prefix (personalized context first, no shared prefix) means every request is a 1.25× *write* with zero reads — caching makes that workload **25% more expensive**. Caching pays only when a prefix repeats within the TTL; the design job is *making* prefixes repeat by ordering stable content first.

---

### Q11. Your cache hit rate is zero despite identical-looking prompts. Walk through the silent invalidators.

**Answer:**

Byte-level prefix matching means invalidation is invisible in code review — the prompts *look* the same. Audit checklist, in order of how often each is the culprit:

| Invalidator | Why it kills the cache | Fix |
|---|---|---|
| `new Date()` / timestamp interpolated into system prompt | Prefix differs every request/second | Move time context into the final user message, after the breakpoint |
| `crypto.randomUUID()` / request ID early in the prompt | Every request unique | Same — or drop it; it's rarely load-bearing |
| `JSON.stringify(obj)` with nondeterministic key order (object spread, `Set`/`Map` iteration) | Same data, different bytes | Serialize with sorted keys, always |
| Tool set varies per user/request (feature flags building `tools`) | Tools render at position 0 — everything downstream invalidated | Freeze one tool list; gate behavior in the prompt, not the tool array |
| Conditional system sections (`if (isPro) system += ...`) | Each flag combination is a distinct prefix | Static superset prompt; inject per-user facts after the breakpoint |
| Model or provider switch mid-conversation | Caches are model-scoped | Pin the model per conversation |
| Prefix under the minimum (~1024–4096 tokens) | Silently not cached at all | Check `cache_creation_input_tokens > 0` on request #1 |

The debugging method that always works: capture the fully rendered request bodies of two "identical" requests and **diff the bytes**. The invalidator is in the diff; it cannot hide.

The structural rule generalizing all seven rows — order content by stability:

```
  [ tools (frozen, sorted) ][ system (frozen) ][ old turns ][ new turn ]
  ────────────── stable ──────────────▲──────── volatile ──────────────
                                 breakpoint(s)
  Anything volatile BEFORE a breakpoint poisons everything after it.
```

**Production war story:** A support copilot's Claude bill was ~3× projection despite `cache_control` on a 60K-token system prompt. `cache_read_input_tokens` was 0 on every request. The system prompt's first line: `You are AcmeBot. Current time: ${new Date().toISOString()}`. Millisecond-precision timestamps meant every request wrote a fresh 60K-token cache entry at 1.25× and read nothing — they were paying the premium for the privilege of never hitting. Moving the timestamp into the user turn took ten minutes and cut the bill by two-thirds the same day.

---

### Q12. How do you cache multi-turn conversations, where the prompt grows every turn?

**Answer:**

Conversations are the ideal caching workload because each request's prompt is the previous request's prompt *plus a suffix* — a natural rolling prefix. The pattern: keep a breakpoint on the stable system prefix, and move a second breakpoint to the end of the newest appended turn each request.

```typescript
async function converse(
  history: Anthropic.MessageParam[],
  userMessage: string,
): Promise<{ reply: string; history: Anthropic.MessageParam[] }> {
  const messages: Anthropic.MessageParam[] = [
    ...history,
    {
      role: "user",
      content: [
        {
          type: "text",
          text: userMessage,
          // Rolling breakpoint: caches system + ALL prior turns + this turn.
          // Next request reads this entire prefix at 0.1× and only pays
          // full price for the assistant reply + the new user turn.
          cache_control: { type: "ephemeral" },
        },
      ],
    },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  console.log(
    `read=${response.usage.cache_read_input_tokens} ` +
      `wrote=${response.usage.cache_creation_input_tokens} ` +
      `uncached=${response.usage.input_tokens}`,
  );

  const reply = response.content.find((b) => b.type === "text");
  return {
    reply: reply?.type === "text" ? reply.text : "",
    history: [...messages, { role: "assistant", content: response.content }],
  };
}
```

Per-turn economics: turn N re-sends the entire history (the API is stateless), but with the rolling breakpoint, turns 1..N−1 are a cache read at 0.1×. A 20-turn conversation with ~2K tokens/turn pays full price on ~2K tokens per request instead of up to ~40K — roughly an 8–10× reduction on input cost for long sessions, plus the TTFT win from skipped prefill.

Rules that keep it working: the user must reply within the TTL (5 minutes fits chat; use `ttl: "1h"` for slow workflows and accept the 2× write); never edit or re-serialize earlier turns when appending (byte-identical history or the prefix breaks); and with agentic tool loops, remember earlier breakpoints stay valid — hits accrue incrementally as the transcript grows. This composes with Q4's tool loop directly: put the rolling breakpoint on the latest `tool_result` message.

---

## Rate Limits & Retry

### Q13. What are the rate-limit dimensions, and how do 429 and 529 differ?

**Answer:**

Providers limit on multiple independent axes — you can be throttled on any one of them:

| Dimension | Meaning | Typical trigger |
|---|---|---|
| **RPM** | Requests per minute | Many small calls (classification fan-out) |
| **TPM** (input/output, often separate) | Tokens per minute | Few huge calls (long-context RAG) |
| **TPD** | Tokens per day | Sustained batch workloads hitting a daily ceiling |

Claude surfaces live state in response headers — `x-ratelimit-remaining-*` per dimension — and on a 429, a `retry-after` header stating how many seconds to wait. Production clients read these instead of guessing.

**429 vs 529** is a favorite interview discriminator:

- **429 `rate_limit_error`** — *your* quota is exhausted. Deterministic and per-account. Honor `retry-after`; the fix at the system level is client-side throttling (Q15), a tier bump, or the Batch API.
- **529 `overloaded_error`** — *the provider* is saturated. Global, not about you. Retry with backoff + jitter, and if sustained: shed load, degrade features, or route a fallback model (Haiku is often less loaded than Sonnet).

Retryability table your error handler must encode:

| Status | Retry? | Strategy |
|---|---|---|
| 429 | Yes | Wait `retry-after`, then backoff+jitter |
| 500 / 529 | Yes | Backoff + full jitter |
| 408 / connection errors | Yes | Backoff + jitter |
| 400 / 401 / 403 / 404 / 413 | **No** | Fix the request/key/model — retrying is pure waste |

The SDK auto-retries 429/5xx with exponential backoff (`maxRetries`, default 2), and exposes typed errors — `Anthropic.RateLimitError`, `Anthropic.APIError` (with `.status`) — so classification is `instanceof`, never message string-matching. You write custom retry logic (Q14) when you need a retry *budget*, cross-request coordination, or fallback routing the SDK can't know about.

---

### Q14. Implement exponential backoff with full jitter, retry-after respect, and a retry budget.

**Answer:**

```typescript
import Anthropic from "@anthropic-ai/sdk";

// SDK retries are disabled so this layer owns ALL retry decisions —
// two stacked retry layers multiply attempts and defeat the budget.
const client = new Anthropic({ maxRetries: 0 });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Global retry budget: at most `ratio` of recent requests may be retries.
 *  During a real outage this collapses retry traffic instead of amplifying it. */
class RetryBudget {
  private tokens: number;
  constructor(private readonly max = 10, private readonly ratio = 0.1) {
    this.tokens = max;
  }
  onRequest(): void {
    this.tokens = Math.min(this.max, this.tokens + this.ratio);
  }
  tryConsume(): boolean {
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}
const budget = new RetryBudget();

function classify(err: unknown): { retryable: boolean; retryAfterMs?: number } {
  if (err instanceof Anthropic.RateLimitError) {
    const ra = err.headers?.["retry-after"]; // seconds, per the API contract
    return { retryable: true, retryAfterMs: ra ? Number(ra) * 1000 : undefined };
  }
  if (err instanceof Anthropic.APIError) {
    const s = err.status ?? 0;
    return { retryable: s === 408 || s === 500 || s === 529 || s >= 502 };
  }
  // Connection reset / DNS / socket errors — retryable
  if (err instanceof Error && !(err instanceof TypeError)) {
    return { retryable: true };
  }
  return { retryable: false };
}

export async function createWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
  opts = { maxAttempts: 5, baseMs: 500, capMs: 30_000 },
): Promise<Anthropic.Message> {
  budget.onRequest();

  for (let attempt = 0; ; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      const { retryable, retryAfterMs } = classify(err);
      if (!retryable) throw err;                       // 400/401/404: never retry
      if (attempt + 1 >= opts.maxAttempts) throw err;  // attempts exhausted
      if (!budget.tryConsume()) throw err;             // fleet is melting: shed

      // Full jitter: uniform in [0, min(cap, base * 2^attempt)].
      // retry-after (when present) is authoritative and used as the floor.
      const expCap = Math.min(opts.capMs, opts.baseMs * 2 ** attempt);
      const delay = Math.max(retryAfterMs ?? 0, Math.random() * expCap);
      await sleep(delay);
    }
  }
}
```

Why **full jitter** and not plain exponential backoff: if 1,000 clients fail at the same moment (a 529 blip), deterministic backoff has all 1,000 retry at t+1s, then t+3s, then t+7s — synchronized waves that re-trigger the overload each time. Full jitter spreads each wave uniformly across the window, converting spikes into a flat trickle. This is the "naive retry storms make outages worse" mechanism: retries during an outage are *added load on a system already failing*, and without a budget, a 30-second provider blip becomes a self-sustained 10-minute one — every failure spawning retries that cause failures. The budget makes retry traffic degrade gracefully: some requests fail fast (and surface to fallbacks) instead of everyone hammering.

**Interview trap:** Retrying everything, including 400s. A malformed request retried five times with backoff is 5× the latency to reach the same guaranteed error — and at fleet scale, a deploy that ships one bad parameter turns into a self-inflicted traffic multiplier. Classification before retry is not optional.

---

### Q15. Build a client-side request queue with a concurrency limit and a token bucket.

**Answer:**

Server-side 429 handling is reactive. A production client is *proactive*: it shapes its own traffic to fit its quota so 429s become rare instead of routine. Two controls compose: a **concurrency limit** (bounds simultaneous in-flight requests) and a **token bucket** (bounds sustained rate while allowing bursts).

```typescript
type Task<T> = () => Promise<T>;

class TokenBucket {
  private tokens: number;
  private lastRefill = Date.now();

  constructor(
    private readonly capacity: number,   // max burst
    private readonly refillPerSec: number, // sustained rate
  ) {
    this.tokens = capacity;
  }

  private refill(): void {
    const now = Date.now();
    this.tokens = Math.min(
      this.capacity,
      this.tokens + ((now - this.lastRefill) / 1000) * this.refillPerSec,
    );
    this.lastRefill = now;
  }

  /** Resolves when `cost` tokens are available, consuming them. */
  async take(cost = 1): Promise<void> {
    for (;;) {
      this.refill();
      if (this.tokens >= cost) {
        this.tokens -= cost;
        return;
      }
      const deficitMs = ((cost - this.tokens) / this.refillPerSec) * 1000;
      await new Promise((r) => setTimeout(r, Math.max(deficitMs, 25)));
    }
  }
}

export class LlmQueue {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private readonly bucket: TokenBucket;

  constructor(
    private readonly maxConcurrent = 8,
    requestsPerMinute = 300, // set to ~80% of your actual RPM tier
  ) {
    this.bucket = new TokenBucket(
      Math.max(1, Math.floor(requestsPerMinute / 10)), // burst = 10% of RPM
      requestsPerMinute / 60,
    );
  }

  async submit<T>(task: Task<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active++;
    try {
      await this.bucket.take(1); // rate gate AFTER the concurrency gate
      return await task();
    } finally {
      this.active--;
      this.waiting.shift()?.(); // wake exactly one waiter (FIFO fairness)
    }
  }

  get depth(): number {
    return this.waiting.length; // export this metric — queue depth is your
  }                             // earliest saturation signal, before any 429
}

// Usage — every LLM call in the process goes through one shared queue:
const queue = new LlmQueue(8, 300);

const results = await Promise.all(
  documents.map((doc) =>
    queue.submit(() =>
      createWithRetry({
        model: "claude-haiku-4-5",
        max_tokens: 256,
        messages: [{ role: "user", content: `Classify: ${doc}` }],
      }),
    ),
  ),
);
```

Sizing guidance: set the bucket to ~80% of your RPM tier (headroom for other processes and retries); set `maxConcurrent` from latency math (at 5s average latency, 8 concurrent ≈ 96 RPM sustained). For TPM-bound workloads, take a per-request `cost` proportional to estimated tokens instead of a flat 1 — the bucket logic is unchanged. The queue also gives you the one metric 429 counts can't: `depth` rises *before* you saturate, which is when you want the alert.

---

## Cost Engineering

### Q16. Do the token math: estimate and then compute the monthly cost of a support copilot.

**Answer:**

Current Claude pricing (per 1M tokens):

| Model | Input | Output | Context |
|---|---|---|---|
| `claude-opus-4-8` | $5.00 | $25.00 | 1M |
| `claude-sonnet-5` | $3.00 | $15.00 | 1M |
| `claude-haiku-4-5` | $1.00 | $5.00 | 200K |

Estimation heuristics: English prose runs ~4 characters/token (≈0.75 tokens/word); code and JSON are denser per character (more tokens than the 4:1 rule suggests), and non-English text — especially CJK — can be 2–3× more tokens per character. **Never use tiktoken for Claude** — it's OpenAI's tokenizer and undercounts Claude tokens by 15–20% on prose, worse on code. For real numbers, use the `count_tokens` endpoint:

```typescript
const { input_tokens } = await client.messages.countTokens({
  model: "claude-sonnet-5",
  system: SYSTEM_PROMPT,
  messages: sampleConversation,
});
```

**Worked example** — support copilot, 10,000 conversations/month, 6 turns each:

```
Per turn (measured with count_tokens, not guessed):
  system + tools prefix        6,000 tok
  conversation history (avg)   2,500 tok
  new user message               200 tok
  ─ input/turn                 8,700 tok
  assistant reply                350 tok output

Volume: 10,000 conv × 6 turns = 60,000 turns/month

All-Sonnet, no caching:
  Input:  60,000 × 8,700  = 522M tok × $3/M   = $1,566
  Output: 60,000 ×   350  =  21M tok × $15/M  = $  315
  Total                                        = $1,881/month

With prompt caching (prefix+history cached, ~85% of input at 0.1×):
  Cached:   444M × $0.30/M = $133   Uncached: 78M × $3/M = $234
  Output unchanged                            = $315
  Total                                       ≈ $682/month  (−64%)

Adding model routing (Q17): 70% of turns are simple → Haiku:
  Haiku turns:  42,000 × (8,700 × $1 + 350 × $5)/1M  ≈ $439 → ~$110 cached
  Sonnet turns: 18,000 × (8,700 × $3 + 350 × $15)/1M ≈ $564 → ~$205 cached
  Total                                       ≈ $315/month  (−83% vs baseline)
```

The structural insight to voice: **output tokens are 5× the input price** on every tier, so verbosity is a direct cost lever. Cap `max_tokens` to what the product needs, and instruct concision ("answer in under 100 words unless asked for detail") — a reply that drifts from 350 to 800 tokens more than doubles output spend across the fleet. The cost stack, in order of leverage: cache the prefix → route cheap models → cap output → batch what isn't interactive (Q17).

---

### Q17. Design cheap→expensive model routing, and explain where the Batch API fits.

**Answer:**

Most traffic doesn't need your best model. The production pattern is a router: try cheap, escalate on signal.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface RouteDecision {
  model: "claude-haiku-4-5" | "claude-sonnet-5" | "claude-opus-4-8";
  reason: string;
}

// Stage 1: free heuristics — no LLM call at all
function heuristicRoute(message: string, turnCount: number): RouteDecision | null {
  if (message.length > 4000 || turnCount > 12) {
    return { model: "claude-sonnet-5", reason: "long context" };
  }
  if (/refund|legal|escalat|cancel my account|lawsuit/i.test(message)) {
    return { model: "claude-sonnet-5", reason: "high-stakes keyword" };
  }
  return null;
}

// Stage 2: Haiku answers AND self-reports confidence in one call
const gradedSchema = {
  type: "object",
  properties: {
    answer: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reason: { type: "string" },
  },
  required: ["answer", "confidence", "reason"],
  additionalProperties: false,
};

export async function routedAnswer(
  system: string,
  history: Anthropic.MessageParam[],
  userMessage: string,
): Promise<{ answer: string; model: string }> {
  const forced = heuristicRoute(userMessage, history.length);
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  if (!forced) {
    const cheap = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system,
      output_config: { format: { type: "json_schema", schema: gradedSchema } },
      messages,
    });
    if (cheap.stop_reason !== "max_tokens" && cheap.stop_reason !== "refusal") {
      const text = cheap.content.find((b) => b.type === "text");
      const graded = JSON.parse(text?.type === "text" ? text.text : "{}") as {
        answer: string;
        confidence: "high" | "medium" | "low";
      };
      if (graded.confidence === "high") {
        return { answer: graded.answer, model: "claude-haiku-4-5" };
      }
      // low/medium confidence → fall through and escalate
    }
  }

  const strong = await client.messages.create({
    model: forced?.model ?? "claude-sonnet-5",
    max_tokens: 2048,
    system,
    messages,
  });
  const text = strong.content.find((b) => b.type === "text");
  return {
    answer: text?.type === "text" ? text.text : "",
    model: forced?.model ?? "claude-sonnet-5",
  };
}
```

Escalation math holds even though escalated requests pay twice: if Haiku confidently handles 70% at ~1/3 of Sonnet's price, blended cost is ~0.7×(1/3) + 0.3×(1/3 + 1) ≈ 0.63× — a ~37% cut, and larger once caching applies. Track the escalation rate; if it drifts above ~40%, the classifier or the confidence prompt needs work.

**The Batch API** is the other half of cost engineering: anything not latency-sensitive (nightly ticket summaries, eval runs, embedding-adjacent enrichment, backfills) gets a flat **50% discount**, up to 100K requests per batch, most completing within an hour:

```typescript
const batch = await client.messages.batches.create({
  requests: tickets.map((t) => ({
    custom_id: t.id,
    params: {
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: `Summarize: ${t.body}` }],
    },
  })),
});

let status = batch;
while (status.processing_status !== "ended") {
  await new Promise((r) => setTimeout(r, 60_000));
  status = await client.messages.batches.retrieve(batch.id);
}

const byId = new Map<string, string>();
for await (const result of await client.messages.batches.results(batch.id)) {
  // Results are UNORDERED — key by custom_id, never by position
  if (result.result.type === "succeeded") {
    const text = result.result.message.content.find((b) => b.type === "text");
    byId.set(result.custom_id, text?.type === "text" ? text.text : "");
  }
}
```

**Interview trap:** Matching batch results to inputs by array index. The API returns results in completion order, not submission order — index-matching silently attaches summaries to the wrong tickets and you won't notice until a customer does. `custom_id` is the only join key.

---

## Latency Optimization

### Q18. Break down LLM latency — what drives TTFT vs tokens/sec — and give a latency budget for a chat product.

**Answer:**

Total latency decomposes into phases with different physics and different fixes:

```
 total ≈ network + queue + PREFILL (→ TTFT) + DECODE (output_tokens / tok_per_sec)
                            │                   │
                            │                   └─ sequential generation:
                            │                      driven by OUTPUT length + model size
                            └─ parallel pass over the INPUT:
                               driven by prompt size (cache skips most of it)
```

- **TTFT** = network + queueing + prefill. Prefill scales with *input* tokens — a 100K-token RAG prompt has a multi-second TTFT even though generation hasn't started. Prompt caching (Q10) removes the cached prefix from prefill, which is why it's a latency feature as much as a cost feature.
- **Tokens/sec** (decode) is roughly constant per model tier — smaller models decode faster — so total generation time is effectively `output_tokens / rate`. The strongest lever on total latency is *asking for less output*.

| Lever | Improves | Mechanism |
|---|---|---|
| Streaming | *Perceived* latency | User sees TTFT, not total |
| Prompt caching | TTFT | Skips prefill on the cached prefix |
| Shorter outputs (`max_tokens` + concision prompt) | Total | Decode is linear in output length |
| Smaller model (Haiku) | TTFT + tokens/sec | Less compute per token |
| Trimming input (fewer RAG chunks, compaction) | TTFT | Less prefill |
| Parallelizing independent calls | Wall clock | `Promise.all` on unrelated work |

A latency budget for chat — write it down and alert on the components, not just the total:

| Component | Budget (p50) | Budget (p95) |
|---|---|---|
| Network + auth + routing | 50 ms | 120 ms |
| Retrieval (vector + rerank) | 150 ms | 400 ms |
| Prompt assembly | 10 ms | 25 ms |
| **TTFT** (cached prefix) | 500 ms | 1,200 ms |
| First *visible* token in UI | **≤ 800 ms** | ≤ 1,800 ms |
| Full response (~350 tok @ ~60 tok/s) | ~6 s | ~12 s |

The product truth: users judge the ≤800ms line, not the 6-second line — streaming buys you the difference. Parallelization example: retrieval and a conversation-title generation call are independent, so `await Promise.all([retrieve(q), titleCall(q)])` hides one behind the other instead of stacking them.

---

### Q19. What are speculative patterns for cutting tail latency, and when are they worth the cost?

**Answer:**

When you've exhausted the standard levers, you trade money for latency by doing redundant work:

**1. Racing cheap + expensive (hedged fanout).** Fire Haiku and Sonnet simultaneously; if the cheap answer clears a quality gate, use it and cancel the expensive stream; otherwise wait for Sonnet, whose clock started at t=0 instead of after a failed cheap attempt.

```typescript
export async function hedgedAnswer(
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">,
  isGoodEnough: (m: Anthropic.Message) => boolean,
): Promise<{ message: Anthropic.Message; model: string }> {
  const cheapCtrl = new AbortController();
  const strongCtrl = new AbortController();

  const cheap = client.messages.create(
    { ...params, model: "claude-haiku-4-5" },
    { signal: cheapCtrl.signal },
  );
  const strong = client.messages.create(
    { ...params, model: "claude-sonnet-5" },
    { signal: strongCtrl.signal },
  );

  try {
    const cheapResult = await cheap;
    if (isGoodEnough(cheapResult)) {
      strongCtrl.abort(); // stop paying for the expensive stream
      return { message: cheapResult, model: "claude-haiku-4-5" };
    }
  } catch {
    // cheap path failed — the strong path is already in flight, so no time lost
  }
  const strongResult = await strong;
  cheapCtrl.abort();
  return { message: strongResult, model: "claude-sonnet-5" };
}
```

Compared to sequential escalation (Q17), which costs `t_cheap + t_strong` on escalation, racing costs `max(t_cheap, t_strong)` ≈ `t_strong` — you've deleted the cheap attempt from the critical path at the price of always paying for both calls. Note: aborting a stream mid-generation stops future tokens, but you pay for what was generated before the abort.

**2. Draft-then-verify.** Haiku drafts; Sonnet verifies/edits with a small `max_tokens` (verification output is short even when the draft is long). Total cost ≈ Haiku-draft + Sonnet-short-verify, usually well under a full Sonnet generation, with most of the perceived latency spent streaming the cheap draft. This is the application-level cousin of speculative decoding.

**3. Precomputation.** Speculatively fire the *likely next* request — e.g. when a user opens a ticket, start generating the summary before they click "Summarize." Wasted when they don't click; a 0ms response when they do.

Decision rule: these patterns multiply cost by ~1.3–2× on the affected route. They're justified where latency is revenue-coupled (interactive product moments, demos, voice) and unjustifiable for background/batch work — where the correct answer is the opposite trade (Batch API at 50% off, Q17).

**Interview trap:** Proposing to hedge *every* request. Hedging is a tail-latency tool — apply it to the p95-sensitive routes you can name, not fleet-wide, or you've doubled the bill to fix latency nobody complained about.

---

## Multi-Provider Abstraction

### Q20. When is a gateway (LiteLLM/Portkey/self-built) worth it versus using provider SDKs directly?

**Answer:**

Decision table first, because "always abstract" and "never abstract" are both wrong:

| Situation | Direct SDK | Gateway / abstraction |
|---|---|---|
| Single provider, product team | ✅ default | overkill |
| Deep provider features (caching breakpoints, adaptive thinking, batch) | ✅ full fidelity | often lags or lossy |
| Hard multi-provider requirement (customer mandates Bedrock/Azure) | painful | ✅ |
| Central cost/keys/quota governance across many teams | scattered | ✅ (this is the *real* gateway value) |
| Latency-critical hot path | ✅ no extra hop | adds a hop + a failure domain |
| FDE in a customer env with an approved egress proxy | — | ✅ non-negotiable, it's their policy |

The core argument against premature abstraction is that **LLM providers differ in semantics, not just syntax** — the abstraction leaks in exactly the places production code cares about:

- **Caching:** Claude uses explicit `cache_control` breakpoints with strict prefix-match semantics and 0.1×/1.25× pricing; OpenAI caches automatically with no breakpoints and a 50% cached-input discount. A "portable" prompt layout cannot be optimal for both — breakpoint placement is Claude-specific design work.
- **Tool-call shapes:** Claude interleaves `tool_use` content blocks in `content` and takes results as `tool_result` blocks in a *user* message; OpenAI has a `tool_calls` array on the assistant message and `role: "tool"` result messages. Message-history bookkeeping differs structurally.
- **Streaming events:** `content_block_delta`/`message_delta` vs `chat.completion.chunk` with `choices[].delta` — different envelopes, different places where `stop_reason`/usage arrive.
- **Structured output:** `output_config.format` vs `response_format.json_schema` — similar idea, different knobs and different failure edges.

A gateway that normalizes all of this either exposes the lowest common denominator (you lose Claude's cache economics) or sprouts provider-specific escape hatches (you've reimplemented direct SDK usage with an extra hop). The honest architecture for most teams: **direct SDK behind your own thin internal interface** (Q21) — one file you control, swappable when a real requirement arrives, zero infrastructure. Reach for a hosted gateway when the driver is organizational (governance, central billing, customer mandate), not aesthetic ("we might switch providers someday").

---

### Q21. Design a minimal provider-agnostic `ChatProvider` interface with Claude and OpenAI adapters.

**Answer:**

Normalize only what your application consumes — text, tool calls, usage, finish reason — and keep everything provider-specific inside each adapter.

```typescript
// ---------- Normalized domain types (yours, not any provider's) ----------
export interface ChatMessageIn {
  role: "user" | "assistant" | "tool_result";
  text?: string;
  toolResults?: Array<{ callId: string; content: string; isError?: boolean }>;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface NormalizedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export interface ChatResult {
  text: string;
  toolCalls: NormalizedToolCall[];
  usage: NormalizedUsage;
  finishReason: "stop" | "tool_calls" | "length" | "refusal";
  provider: string;
}

export interface ChatProvider {
  readonly name: string;
  chat(req: {
    system: string;
    messages: ChatMessageIn[];
    tools?: ToolSpec[];
    maxTokens: number;
  }): Promise<ChatResult>;
}

// ---------------------------- Claude adapter ----------------------------
import Anthropic from "@anthropic-ai/sdk";

export class ClaudeProvider implements ChatProvider {
  readonly name = "claude";
  private client = new Anthropic();

  constructor(private model = "claude-sonnet-5") {}

  async chat(req: Parameters<ChatProvider["chat"]>[0]): Promise<ChatResult> {
    const messages: Anthropic.MessageParam[] = req.messages.map((m) =>
      m.role === "tool_result"
        ? {
            role: "user" as const, // Claude: results ride in a USER message
            content: (m.toolResults ?? []).map((r) => ({
              type: "tool_result" as const,
              tool_use_id: r.callId,
              content: r.content,
              is_error: r.isError,
            })),
          }
        : { role: m.role, content: m.text ?? "" },
    );

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens,
      system: [
        // Provider-specific optimization stays INSIDE the adapter:
        { type: "text", text: req.system, cache_control: { type: "ephemeral" } },
      ],
      tools: req.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        strict: true,
        input_schema: t.parameters as Anthropic.Tool["input_schema"],
      })),
      messages,
    });

    return {
      text: res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join(""),
      toolCalls: res.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map((b) => ({
          id: b.id,
          name: b.name,
          arguments: b.input as Record<string, unknown>,
        })),
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        cachedInputTokens: res.usage.cache_read_input_tokens ?? 0,
      },
      finishReason:
        res.stop_reason === "tool_use"
          ? "tool_calls"
          : res.stop_reason === "max_tokens"
            ? "length"
            : res.stop_reason === "refusal"
              ? "refusal"
              : "stop",
      provider: this.name,
    };
  }
}

// ---------------------------- OpenAI adapter ----------------------------
export class OpenAIProvider implements ChatProvider {
  readonly name = "openai";
  constructor(
    private model = "gpt-4o",
    private apiKey = process.env.OPENAI_API_KEY!,
  ) {}

  async chat(req: Parameters<ChatProvider["chat"]>[0]): Promise<ChatResult> {
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: req.system },
    ];
    for (const m of req.messages) {
      if (m.role === "tool_result") {
        // OpenAI: one role:"tool" message PER result, keyed by tool_call_id
        for (const r of m.toolResults ?? []) {
          messages.push({ role: "tool", tool_call_id: r.callId, content: r.content });
        }
      } else {
        messages.push({ role: m.role, content: m.text ?? "" });
      }
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        messages,
        tools: req.tools?.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };

    const choice = data.choices[0];
    return {
      text: choice.message.content ?? "",
      toolCalls: (choice.message.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      })),
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        cachedInputTokens: data.usage.prompt_tokens_details?.cached_tokens ?? 0,
      },
      finishReason:
        choice.finish_reason === "tool_calls"
          ? "tool_calls"
          : choice.finish_reason === "length"
            ? "length"
            : "stop",
      provider: this.name,
    };
  }
}
```

Note what the interface deliberately does **not** hide: OpenAI arguments arrive as a JSON *string* (parsed in the adapter, one more failure mode Claude doesn't have); tool results travel as user-message blocks on Claude vs per-call `role: "tool"` messages on OpenAI; caching is an adapter-internal optimization with different economics per provider. That's the leaky abstraction from Q20, contained in ~100 lines you own.

---

### Q22. Design cross-provider failover — and explain why doing it silently is dangerous.

**Answer:**

Failover is a circuit around a normalized interface: primary fails on a *retryable* class → try secondary. The critical design decision is that a cross-provider switch must be **explicit and observable**, never a silent implementation detail.

```typescript
type FailoverEvent = {
  from: string;
  to: string;
  cause: string;
  requestId: string;
  at: string;
};

export class FailoverChat implements ChatProvider {
  readonly name = "failover";
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(
    private primary: ChatProvider,
    private secondary: ChatProvider,
    private onFailover: (e: FailoverEvent) => void, // metrics + alerting hook
    private breakerThreshold = 5,
    private breakerCooldownMs = 60_000,
  ) {}

  async chat(req: Parameters<ChatProvider["chat"]>[0]): Promise<ChatResult> {
    const requestId = crypto.randomUUID();

    if (Date.now() >= this.circuitOpenUntil) {
      try {
        const result = await this.primary.chat(req);
        this.consecutiveFailures = 0;
        return result;
      } catch (err) {
        if (!isRetryableInfraError(err)) throw err; // 400s must NOT fail over:
        this.consecutiveFailures++;                 // same bad request on another
        if (this.consecutiveFailures >= this.breakerThreshold) {
          this.circuitOpenUntil = Date.now() + this.breakerCooldownMs;
        }
        this.onFailover({
          from: this.primary.name,
          to: this.secondary.name,
          cause: String(err),
          requestId,
          at: new Date().toISOString(),
        });
      }
    }
    const result = await this.secondary.chat(req);
    // The caller SEES which provider answered — this is the non-negotiable part
    return { ...result, provider: this.secondary.name };
  }
}

function isRetryableInfraError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const s = err.status ?? 0;
    return s === 429 || s === 500 || s === 529 || s >= 502;
  }
  return err instanceof Error && /fetch|network|timeout|ECONN/i.test(err.message);
}
```

Why *silent* failover is dangerous — three concrete failure modes:

1. **Evals become meaningless.** Your quality dashboards, regression tests, and prompt tuning are calibrated against one model's behavior. If 8% of Tuesday's traffic silently served a different provider, Tuesday's metrics describe a blend no one can reproduce. Every result must carry the `provider` tag, and eval slices must group by it.
2. **Caching economics collapse.** Prompt caches are provider- and model-scoped. Every failed-over request is a full-price cold-cache request on the secondary — and if flapping is frequent, you pay cache *writes* on both sides while sustaining hits on neither. The circuit breaker exists to prevent flapping as much as to shed load.
3. **Behavioral drift ships to users mid-conversation.** Different tool-calling eagerness, formatting, refusal boundaries. A conversation that switches providers between turns can visibly change persona — and structured-output edge behavior (Q2) differs, so a downstream parser tuned on the primary can start failing only on failed-over traffic, which is exactly the traffic you're not looking at.

The mature posture: failover is an *incident response mechanism*, instrumented and alerted (the `onFailover` hook feeding a metric + page), with the secondary path exercised regularly via synthetic traffic — an untested failover path is a second outage waiting behind the first. It is not a routing strategy; if you want multi-provider routing by design, do it deliberately per-route with per-provider evals, not as an exception handler's side effect.

---

*End of module. Suggested drills: implement Q3's retry loop and Q4's tool loop from memory; recompute Q10 and Q16's cost math with your own workload numbers; and be ready to whiteboard the SSE event sequence and the tools → system → messages cache-prefix order without notes.*
