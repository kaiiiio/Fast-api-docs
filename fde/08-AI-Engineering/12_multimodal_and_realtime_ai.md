# Multimodal and Realtime AI for FDEs

Most FDE customer asks that *look* like "chatbot" work are actually multimodal: "read these 40,000 scanned invoices," "let users talk to the assistant," "pull the line items out of this screenshot." This file is the production playbook for vision, audio, realtime voice agents, image generation, multimodal RAG, and the cost/latency numbers you need to scope any of them.

Model IDs used throughout: `claude-opus-4-8` (vision, hardest extraction), `claude-sonnet-5` (high-volume extraction, the default production workhorse), `claude-haiku-4-5` (classification, routing, cheap first-pass). Pricing anchors (per 1M tokens): Opus 4.8 `$5 / $25`, Sonnet 5 `$3 / $15`, Haiku 4.5 `$1 / $5`.

---

## Part 1 — Vision: document understanding and OCR-free extraction

### Q1. When does a vision model beat a classic OCR pipeline, and when does OCR still win?

**Answer:**

The instinct of every engineer who has done document processing before 2024 is "OCR then parse." That instinct is now wrong more often than it is right, but not *always* wrong. Here is the decision boundary.

A **classic OCR pipeline** looks like: image → deskew/denoise → text detection (bounding boxes) → text recognition (Tesseract / AWS Textract / Google Document AI) → layout reconstruction → regex/template extraction → validation. Every stage has its own failure mode and its own tuning knobs.

A **vision-model pipeline** collapses all of that into one call: image → Claude (`claude-opus-4-8` or `claude-sonnet-5`) with a structured-output schema → validated JSON. The model does detection, recognition, layout reasoning, and extraction jointly.

```
Classic OCR pipeline                    Vision-model pipeline
─────────────────────                   ─────────────────────
  scan.pdf                                scan.pdf
    │                                       │
    ▼                                       ▼
 deskew / denoise                      [ Claude vision + JSON schema ]
    │                                       │
    ▼                                       ▼
 text detection (boxes)                validated JSON
    │                                    (fields already mapped)
    ▼
 OCR recognition (chars)
    │
    ▼
 layout reconstruction
    │
    ▼
 template / regex extract
    │
    ▼
 validation
```

**Vision wins when:**
- Layout varies per document (every vendor's invoice looks different). Templates don't generalize; the model reasons about structure.
- Fields are semantic, not positional ("the total *after* discount," "the ship-to that isn't the bill-to").
- The document mixes text, tables, stamps, handwriting, and logos.
- Volume is low-to-moderate (thousands to low millions/month) so per-page model cost is acceptable.
- You need the *meaning* extracted, not a faithful text transcript.

**Classic OCR still wins when:**
- You need exact character-level fidelity across millions of pages (e.g. legal discovery, full-text search index). OCR is cheaper per page at extreme scale.
- The document is a clean, fixed template (a form your own system generated). A regex on Textract output is faster and free of model variance.
- You need reproducible, auditable coordinates for every character (redaction pipelines, compliance).
- Latency budget is sub-100ms per page and you can't batch.

**The hybrid that FDEs actually ship most often:** run cheap OCR (Textract) to get a text layer and word-level bounding boxes, then feed *both the image and the OCR text* to Claude. The OCR text grounds the model (fewer transcription errors on dense tables), and the image lets it reason about layout the OCR flattened. See Q9.

**Interview trap:** The interviewer says "we already pay for Textract, why add an LLM?" The wrong answer is "LLMs are better." The right answer: "Textract gives you *text and boxes*; it doesn't give you *the answer*. Your team is currently writing and maintaining per-vendor extraction templates on top of Textract output — that maintenance is the cost. A vision model replaces the template layer, not the OCR layer. Keep Textract for the boxes, add the model for the reasoning, and you delete the template code."

---

### Q2. How do you get structured, schema-validated data out of a document image?

**Answer:**

Never parse free text back out of a model. Use structured outputs so the model is constrained to your JSON schema at generation time. Here is a complete invoice extractor.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import fs from "fs";

const client = new Anthropic();

const LineItem = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  amount: z.number(),
});

const Invoice = z.object({
  invoice_number: z.string(),
  invoice_date: z.string().describe("ISO 8601 date, YYYY-MM-DD"),
  vendor_name: z.string(),
  vendor_tax_id: z.string().nullable(),
  bill_to: z.string(),
  ship_to: z.string().nullable(),
  currency: z.string().describe("ISO 4217 code, e.g. USD"),
  line_items: z.array(LineItem),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  // Force the model to tell you when it is guessing.
  low_confidence_fields: z
    .array(z.string())
    .describe("Field names the model was unsure about; empty if fully confident"),
});

export async function extractInvoice(pngPath: string) {
  const imageData = fs.readFileSync(pngPath).toString("base64");

  const response = await client.messages.parse({
    model: "claude-sonnet-5", // Sonnet 5 is the workhorse for high-volume extraction
    max_tokens: 4096,
    output_config: { format: zodOutputFormat(Invoice) },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: imageData },
          },
          {
            type: "text",
            text:
              "Extract this invoice into the schema. Compute nothing you cannot see — " +
              "if a field is absent, use null (or omit from arrays). " +
              "Do not invent a tax ID. List any field you are unsure about in low_confidence_fields.",
          },
        ],
      },
    ],
  });

  const invoice = response.parsed_output!;

  // Arithmetic validation is your cheapest, highest-signal check. Do it in code,
  // never trust the model's math blindly.
  const computed = invoice.line_items.reduce((s, li) => s + li.amount, 0);
  const arithmeticOk = Math.abs(computed + invoice.tax - invoice.total) < 0.02;

  return { invoice, arithmeticOk, usage: response.usage };
}
```

Two things that separate a demo from production here:

1. **`low_confidence_fields`** — you are giving the model an escape hatch instead of forcing a hallucinated value. Route any document with a non-empty list (or a failed arithmetic check) to human review.
2. **Arithmetic validation in code.** The model can misread a `7` as a `1`. Line items summing to the stated total is a free, deterministic check that catches a large fraction of OCR-level errors.

**Production war story:** A team shipped an invoice extractor that hit 96% field accuracy in eval and started leaking money in production. The failure: European invoices use `1.234,56` (comma decimal). The model read `1.234,56` as `1234.56` sometimes and `1.23456` other times. The fix wasn't a better prompt — it was (a) adding `currency`/locale to the schema so the model committed to a convention, and (b) the arithmetic check, which flagged every mis-parsed decimal because the line items stopped summing. The lesson: **validation catches the class of error your eval set didn't sample.**

---

### Q3. How do you get bounding boxes out of a vision model, and why would you want them?

**Answer:**

You want boxes for three reasons: (1) to draw a highlight overlay so a human reviewer can verify a field in one glance, (2) to crop a region and re-ask at higher resolution when confidence is low, (3) to build training data for a cheaper downstream model.

On the current-generation models (Opus 4.7+, Sonnet 5), coordinates the model returns map **1:1 to actual image pixels** — there is no scale-factor math. Ask for boxes in the schema:

```typescript
const FieldWithBox = z.object({
  value: z.string(),
  // [x_min, y_min, x_max, y_max] in pixels of the original image
  bbox: z.array(z.number()).length(4),
});

const Located = z.object({
  invoice_number: FieldWithBox,
  total: FieldWithBox,
});
```

Then overlay for review:

```typescript
import { createCanvas, loadImage } from "canvas";

async function drawOverlay(imgPath: string, boxes: number[][], outPath: string) {
  const img = await loadImage(imgPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  for (const [x0, y0, x1, y1] of boxes) {
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
}
```

**Caveat to set expectations with:** LLM bounding boxes are *good enough for review and cropping*, not pixel-perfect like a dedicated object-detection model. If your product requires tight, reproducible boxes (automated redaction where a 5px miss leaks PII), use a purpose-built detector (or OCR word boxes) for the coordinates and the LLM for the semantics. High-resolution vision (up to 2576px on the long edge on current models) improves box quality — don't downsample documents before sending if you need the boxes.

**Interview trap:** "Can the model give me exact coordinates for redaction?" Say no, and explain why: LLM localization is approximate. For redaction, use OCR word-level boxes (deterministic) and use the LLM only to decide *which* words to redact. Conflating "the model can point at things" with "the model can produce legally-defensible redaction masks" is how you ship a PII leak.

---

### Q4. What are the real image-token costs, and how do you keep vision affordable at scale?

**Answer:**

Images are billed as input tokens. A full-resolution image on current models can consume up to ~4,784 tokens (vs ~1,600 on older models) because of high-res support. Rough sizing:

| Image | Approx input tokens | Input cost @ Sonnet 5 ($3/1M) | @ Opus 4.8 ($5/1M) |
|---|---|---|---|
| Small (≤1000px) | ~500–800 | ~$0.0018 | ~$0.003 |
| Typical document page (1080p) | ~1,500–2,500 | ~$0.006 | ~$0.010 |
| Full-res dense scan (2576px) | ~4,000–4,784 | ~$0.014 | ~$0.024 |

Plus the prompt (schema + instructions, ~500–1,500 tokens) and the output JSON (~300–1,000 tokens). For a realistic invoice: call it **~$0.01–0.02 on Sonnet 5**, **~$0.02–0.03 on Opus 4.8** per page all-in.

Levers, in order of impact:

1. **Right-size the image.** Sending a 4000px scan when 1080p reads perfectly triples your image tokens for zero accuracy gain. Downsample to the smallest resolution that keeps the text legible. Measure with `count_tokens` on representative pages.
2. **Prompt-cache the schema and instructions.** The schema + system prompt is identical across every document. Put it before a `cache_control` breakpoint; the per-request image goes after. Cache reads are ~0.1× — you stop paying full price for the boilerplate on every page.
3. **Model tiering.** Route clean, high-template documents to Haiku 4.5 (`$1/$5`); route messy or high-value ones to Sonnet 5; reserve Opus 4.8 for the documents that fail validation on Sonnet.
4. **Batch API for anything not latency-sensitive.** 50% off. A backlog of 40,000 invoices is the textbook batch job.

```typescript
// Cache the invariant prefix (schema lives in system); image varies per request.
const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 4096,
  system: [
    { type: "text", text: EXTRACTION_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
  ],
  messages: [{ role: "user", content: [imageBlock, "Extract per the schema."] }],
});
```

**Cost model for scoping (memorize this shape):** monthly cost ≈ `pages/month × per-page cost × (1 − cache_savings) × (0.5 if batch)`. For 500,000 pages/month at $0.012/page on Sonnet 5 with schema caching (~30% saving on the non-image tokens) and batch: roughly **$4,000–4,500/month**. That number closes deals or kills them — have it ready.

---

## Part 2 — Audio: STT/TTS pipelines and streaming transcription

### Q5. What does a production speech-to-text (STT) → LLM → text-to-speech (TTS) pipeline look like, and where are the latency traps?

**Answer:**

Claude is text-in/text-out — it does not ingest raw audio or emit audio. So an "AI that talks" is always three components stitched together:

```
  mic ──▶ STT ──▶ text ──▶ Claude ──▶ text ──▶ TTS ──▶ speaker
        (Deepgram/       (claude-      (ElevenLabs/
         Whisper/         sonnet-5)     Cartesia/
         AssemblyAI)                    OpenAI TTS)
```

Each hop adds latency. The naive, batch version of this pipeline feels broken in conversation because latencies stack **sequentially**:

| Stage | Naive (batch) | Streaming/optimized |
|---|---|---|
| STT (final transcript) | 500–1500 ms after speech ends | 100–300 ms (streaming, partial→final) |
| LLM time-to-first-token | 400–800 ms | 300–500 ms (streaming) |
| LLM full response | 1–4 s | first sentence in ~500 ms |
| TTS first audio | 300–800 ms | 100–300 ms (streaming TTS) |
| **Perceived turn latency** | **2.5–7 s (unusable)** | **~0.8–1.5 s (natural)** |

The single most important architectural rule: **stream everything and overlap the stages.** You do not wait for the full transcript, then the full LLM response, then the full audio. You:

- Use **streaming STT** that emits partial hypotheses; commit on the endpointing signal.
- **Stream the LLM** and pull the first *sentence* out as soon as it's complete.
- Feed that first sentence to **streaming TTS** while the LLM is still generating sentence two.

```typescript
// Sentence-chunked TTS handoff: start speaking sentence 1 while the LLM writes sentence 2.
async function speakAsClaudeGenerates(userText: string, tts: TTSStream) {
  const stream = client.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: userText }],
  });

  let buffer = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      buffer += event.delta.text;
      // Flush complete sentences to TTS as they form.
      let match;
      while ((match = buffer.match(/^(.+?[.!?])\s+/s))) {
        tts.enqueue(match[1]); // start synthesizing/playing immediately
        buffer = buffer.slice(match[0].length);
      }
    }
  }
  if (buffer.trim()) tts.enqueue(buffer.trim());
  tts.end();
}
```

**Interview trap:** "Why is our voice bot so slow when Claude's TTFT is only 400ms?" Because the team is running the pipeline sequentially and blocking on the *full* LLM response before TTS. The latency isn't in any one model — it's in the lack of overlap. The fix is architectural (streaming + sentence chunking), not a faster model.

---

### Q6. What's the latency budget for streaming transcription, and how do you decide STT vendor vs self-hosted Whisper?

**Answer:**

Budget for **real-time** conversation is roughly: everything from end-of-speech to first-audio-out under ~1 second feels natural; 1–2s is tolerable; over 2s people start talking over the bot.

Allocation for a 1000ms target:
- STT finalization after endpoint: **~200ms**
- Network + orchestration overhead: **~100ms**
- LLM TTFT: **~400ms**
- TTS first audio: **~200ms**
- Playback buffer: **~100ms**

That leaves *no* room for a batch STT that waits 1.5s for a final transcript. You need streaming STT with fast endpointing.

**Vendor (Deepgram, AssemblyAI, Google) vs self-hosted Whisper:**

| | Managed STT vendor | Self-hosted Whisper (large-v3) |
|---|---|---|
| Streaming/partials | Yes, native, tuned endpointing | Whisper is batch by design; streaming needs a wrapper (whisper-streaming, faster-whisper + VAD) and is hackier |
| Latency | 100–300ms finalization | 300ms–2s depending on chunking; harder to get sub-500ms |
| Cost | ~$0.004–0.01 / minute | GPU cost; cheaper at very high volume, ops-heavy |
| Accuracy | Excellent on conversational audio | Excellent, especially non-English; worse on real-time chunked audio |
| Privacy | Audio leaves your infra | Stays in your VPC — the reason to self-host |

**When to self-host Whisper:** hard privacy requirement (audio can't leave the VPC), non-English/multilingual where Whisper excels, or batch transcription at massive scale where per-minute vendor pricing dominates. **Otherwise use a streaming vendor** — the endpointing and partial-hypothesis engineering is genuinely hard and not where you add customer value.

**Production war story:** A team built a voice agent on batch Whisper because "we already had it for offline transcription." In conversation it felt broken — 2.5s dead air after every utterance. They spent a week tuning Whisper chunk sizes, got it to ~1.5s, still bad. Switching the *real-time* path to a streaming vendor (Deepgram) got them to ~250ms finalization; they kept Whisper for the offline/bulk transcription path where latency doesn't matter. **Two paths, two tools** — don't force one STT engine to serve both batch and realtime.

---

## Part 3 — Realtime voice agents: turn-taking, barge-in, and the latency stack

### Q7. How does turn detection (endpointing) work, and why is it the hardest part of a voice agent?

**Answer:**

Turn detection = deciding *the human has finished their turn and it's the bot's turn to respond.* Get it too eager and the bot interrupts the user mid-sentence. Too slow and there's awkward dead air. This is the number-one thing that makes voice agents feel dumb.

Signals used, roughly in order of sophistication:

1. **Silence-based VAD (voice activity detection):** wait N ms of silence after speech. Simple, and wrong for anyone who pauses to think. A 700ms threshold cuts off slow talkers; a 1500ms threshold makes fast talkers wait forever.
2. **Endpoint models (semantic VAD):** models that use acoustic *and* linguistic cues to predict end-of-turn — falling intonation, completed syntax. Vendors ship these (Deepgram, LiveKit turn detector). Much better than fixed silence.
3. **LLM-in-the-loop confirmation:** for high-stakes turns, a fast model classifies "is this a complete thought?" Adds latency; use sparingly.

```
User speaking ────────────────────┐
                                   │  VAD detects speech end
                                   ▼
                          [ endpoint model: is the turn over? ]
                             │ no                    │ yes
                             ▼                       ▼
                     keep listening          commit transcript,
                     (user paused)           start LLM turn
```

The pragmatic production setup: **semantic endpointing with a configurable silence floor**, plus barge-in (Q8) so that even when you guess the turn boundary wrong, the user can just start talking and the bot yields.

**Interview trap:** "Just wait for 1 second of silence." That's the answer that fails the demo. Real speech has mid-sentence pauses ("I'd like to... uh... book a flight to Denver"). A fixed silence threshold either interrupts at "uh" or feels sluggish. The senior answer names semantic endpointing and, crucially, says the real safety net is barge-in — you will never get turn detection perfect, so design so that being wrong is cheap.

---

### Q8. How do you implement interruption / barge-in handling?

**Answer:**

Barge-in = the user starts talking while the bot is speaking, and the bot stops, listens, and responds to the new input. Without it, the bot steamrolls the user and the interaction feels robotic.

The mechanics:

1. Keep the mic **open while the bot is playing TTS** (this requires echo cancellation so the bot doesn't hear itself — AEC on the client, or a vendor that handles it).
2. Run VAD on the incoming mic stream continuously.
3. On detected user speech above a threshold during bot playback: **immediately stop TTS playback, cancel the in-flight LLM generation, and cancel pending TTS synthesis.**
4. Reconcile context: the bot said only part of its response. You must record *what the user actually heard*, not what the LLM generated, so the conversation history is accurate.

```typescript
class VoiceTurnController {
  private llmAbort?: AbortController;
  private spokenSoFar = "";

  async botTurn(userText: string, history: Msg[]) {
    this.llmAbort = new AbortController();
    this.spokenSoFar = "";
    const stream = client.messages.stream(
      { model: "claude-sonnet-5", max_tokens: 1024, messages: [...history, { role: "user", content: userText }] },
      { signal: this.llmAbort.signal },
    );
    try {
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          this.spokenSoFar += ev.delta.text; // track what's actually been queued to TTS
          this.tts.enqueue(ev.delta.text);
        }
      }
    } catch (e) {
      if (this.llmAbort.signal.aborted) return; // barged-in; swallow
      throw e;
    }
  }

  // Called by the VAD when user speech is detected during bot playback.
  onUserBargeIn() {
    this.tts.stop();          // cut audio immediately
    this.llmAbort?.abort();   // cancel LLM generation
    // Record only the portion the user actually heard before we cut off.
    this.commitAssistantTurn(this.tts.playedTextSoFar());
  }
}
```

The subtle bug that separates seniors from juniors: **what goes into conversation history after a barge-in.** If you write the *full* LLM response to history, the model thinks it said things the user never heard, and the conversation desyncs ("As I mentioned, the price is $400" — it never got to say that). Commit only `tts.playedTextSoFar()` — the text that actually reached the speaker before you cut it.

**Production war story:** A support voice bot kept referencing information it had been interrupted before delivering. Users got "per the terms I outlined" when no terms were outlined. Root cause: history captured the generated text, not the spoken text. The fix was tracking the TTS playback cursor and committing only the played prefix. **In voice, ground truth is what came out of the speaker, not what came out of the model.**

---

### Q9. Walk through the full end-to-end latency stack for a voice agent and its budget.

**Answer:**

Here is the complete stack with a ~900ms end-to-end target (end of user speech → first bot audio). This is the diagram to draw on the whiteboard.

```
 t=0    User stops speaking
  │
  ├─ 50ms   VAD/endpoint decides turn is over ────────── turn detection
  │
  ├─ 150ms  STT emits final transcript ───────────────── STT finalization
  │         (partials were already streaming; this is the commit)
  │
  ├─ 30ms   Orchestrator builds prompt, sends to Claude ─ your code
  │
  ├─ 400ms  Claude time-to-first-token ───────────────── LLM TTFT
  │         (streaming; first sentence complete ~550ms)
  │
  ├─ 180ms  TTS synthesizes first chunk ──────────────── TTS first audio
  │
  ├─ 80ms   Network + playback buffer ────────────────── transport
  │
  ▼
 t≈890ms   First bot audio reaches the user's ear
```

Budget table you can defend in an interview:

| Component | Budget | Who owns it | Optimization |
|---|---|---|---|
| Turn detection | 50–150ms | STT vendor / VAD | Semantic endpointing, tuned silence floor |
| STT finalization | 100–250ms | STT vendor | Streaming STT, not batch |
| Orchestration | 20–50ms | You | Keep prompt assembly cheap; pre-warm cache |
| LLM TTFT | 300–500ms | Model | Stream; prompt-cache the system prompt; smaller model if quality allows |
| TTS first audio | 100–300ms | TTS vendor | Streaming TTS, sentence chunking |
| Transport/playback | 50–100ms | Infra | Regional deployment, WebRTC over WebSocket |

Key architectural decisions that keep you in budget:

- **Prompt caching on the system prompt.** The persona/instructions are identical every turn. Cache them so LLM TTFT isn't paying to re-process 2K tokens each turn. Pre-warm at session start with a `max_tokens: 0` request.
- **Colocate.** Run your orchestrator in the same region as the STT/TTS vendor's endpoint and near the LLM. Cross-region round trips silently eat 100–200ms.
- **Model choice is a latency lever.** Sonnet 5 for the conversation; drop to Haiku 4.5 for pure routing/classification sub-calls. Reserve Opus 4.8 for turns that genuinely need it — its latency floor is higher.
- **Don't over-think.** Adaptive thinking adds latency; for a fast conversational agent, keep thinking off (omit the param) and rely on a tight system prompt. Turn thinking on only for turns that need reasoning (a complex booking calculation), routed by a cheap classifier.

**Interview trap:** "What's your p99 latency?" For voice, the honest answer separates the *steady-state* turn (~900ms, which you budget above) from the *tail*: a cold cache on the first turn, a model overload retry, or a barge-in re-generation. Name the tail sources and your mitigations (pre-warm, retry with Haiku fallback, regional redundancy). An interviewer who hears only the happy-path p50 number knows you haven't run one in production.

---

## Part 4 — Image generation for product use

### Q10. When is LLM-driven image generation actually the right product feature, and how do you wire it up safely?

**Answer:**

Image *generation* (creating pixels) is a different model family from Claude — Claude reasons about and describes images but does not generate them. In an FDE context, image generation shows up as: product mockups, marketing/ad variants, thumbnail generation, synthetic training data, and "turn this description into a diagram."

The FDE pattern is usually **Claude as the orchestrator/prompt-writer, a generation model as the renderer**:

```
user intent ──▶ Claude (structured art direction) ──▶ image model ──▶ Claude (vision QA) ──▶ deliver/reject
                 "expand brief into a precise         (DALL·E /       "does this match
                  generation prompt + params"          SDXL / etc.)    the brief? safe?"
```

Claude adds value on both ends: (1) turning a vague user request into a precise, well-structured generation prompt (models render literal prompts far better than vague ones), and (2) doing **vision QA on the output** — checking the generated image actually matches the brief and contains no policy violations (unexpected text, brand-unsafe content, wrong product) before it reaches the user.

```typescript
// End: Claude vision-QA gate on a generated image before it ships to the user.
const qa = await client.messages.parse({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  output_config: {
    format: zodOutputFormat(
      z.object({
        matches_brief: z.boolean(),
        contains_text: z.boolean(),
        brand_safe: z.boolean(),
        issues: z.array(z.string()),
      }),
    ),
  },
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: generatedB64 } },
        { type: "text", text: `Brief was: "${brief}". Verify the image matches, flag any rendered text, and check brand safety.` },
      ],
    },
  ],
});
if (!qa.parsed_output!.matches_brief || !qa.parsed_output!.brand_safe) {
  // regenerate or route to human; never auto-ship a failed QA
}
```

**When it's the wrong feature:** if the customer needs *exact* brand assets (precise logo, exact product SKU rendering), generation hallucinates details and you'll fight it forever. Use a templating/compositing pipeline (overlay real assets) instead, and use generation only for backgrounds/variation. **Interview trap:** proposing generative images for anything requiring factual/brand fidelity signals you don't know the failure modes.

---

## Part 5 — Multimodal RAG

### Q11. How is multimodal RAG different from text RAG, and how do you build it?

**Answer:**

In text RAG you embed chunks of text and retrieve by semantic similarity. In **multimodal RAG** your corpus contains images, charts, scanned pages, screenshots, and diagrams — content where the *meaning is in the pixels*, not in an extractable text layer. The question "what was Q3 revenue?" might only be answerable from a bar chart with no numbers printed on it.

Two architectural approaches:

**Approach A — Describe-then-embed (text-index).** Run each image through Claude vision once at ingest to produce a rich textual description (and any extracted data), embed the *description*, and retrieve with your normal text embedding model. At query time, retrieve the descriptions and optionally re-attach the original image to the final answer call.

```
INGEST                                    QUERY
──────                                    ─────
image ──▶ Claude vision ──▶ description    query ──▶ embed ──▶ vector search
                              │                                    │
                              ▼                                    ▼
                       embed + store              top-k descriptions (+ image refs)
                       (text embedding)                            │
                                                                   ▼
                                              Claude answers with descriptions
                                              + original images re-attached
```

**Approach B — Multimodal/visual embeddings (image-index).** Use a multimodal embedding model (e.g. a CLIP-family or a dedicated visual-document embedder like ColPali-style) that embeds the *image itself* into the same space as text queries. Retrieve pages by visual similarity, then hand the retrieved *page images* to Claude to answer.

| | A: Describe-then-embed | B: Visual embeddings |
|---|---|---|
| Ingest cost | High (a vision call per image) | Low (one embedding pass) |
| Retrieval quality on charts/layout | Depends on description quality | Strong — preserves visual layout |
| Infra | Reuse existing text vector DB | New multimodal embedder + index |
| Debuggability | Easy — descriptions are human-readable | Harder — opaque visual vectors |
| Best for | Mixed corpora, existing text-RAG stack | Dense visual docs (financial reports, slides) |

**The pragmatic FDE choice:** start with **A** because it reuses the customer's existing text-RAG infrastructure and the descriptions are debuggable (you can *read* why something was retrieved). Move to **B** only when eval shows描述-then-embed is losing chart/layout questions. The most common shipped system is A with the original image re-attached at answer time — text retrieval for recall, the real pixels for the final grounded answer.

```typescript
// Answer step in Approach A: retrieved text descriptions PLUS the original page images.
const answer = await client.messages.create({
  model: "claude-opus-4-8", // Opus for the hard synthesis-over-images step
  max_tokens: 2048,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: `Question: ${query}\n\nRelevant pages are attached. Cite the page each fact comes from.` },
        ...retrievedPages.flatMap((p) => [
          { type: "text" as const, text: `--- Page ${p.id} ---` },
          { type: "image" as const, source: { type: "base64" as const, media_type: "image/png" as const, data: p.imageB64 } },
        ]),
      ],
    },
  ],
});
```

**Production war story:** A team built financial-document RAG with pure text extraction (OCR the PDFs, embed the text). Accuracy cratered on any question answered by a chart, because the charts' data wasn't in the text layer. They didn't need to rebuild — they added a describe-then-embed pass over the figures (Claude vision generates a data-table description of each chart at ingest), embedded those, and re-attached figure images at answer time. The lesson: **when RAG mysteriously fails on a subset of questions, check whether the answer lives in a modality your retrieval can't see.**

---

### Q12. What's the ingest cost of multimodal RAG and how do you keep it sane?

**Answer:**

The trap is that Approach A costs one vision call *per image at ingest*, and a large document corpus has a lot of images. 200,000 document pages × ~$0.012/page (Sonnet 5) = **~$2,400 one-time**, plus re-runs whenever you improve the description prompt.

Controls:
- **Batch API for the entire ingest.** It's the definition of a non-latency-sensitive job. Halve the cost.
- **Cache the description prompt/schema** across the run.
- **Skip pages that are pure text** — cheap heuristic (does the PDF have a text layer with >N words?) routes clean text pages to normal text chunking and only sends figures/scans through vision.
- **Tier the model:** Haiku 4.5 for simple figures, Sonnet 5 for dense tables, Opus 4.8 only for the pages that fail a downstream eval.

Re-ingest cost is the sneaky one: every prompt improvement re-runs the whole corpus. Version your description prompt and only re-process changed/failed subsets, not the whole corpus each time.

---

## Part 6 — Structured extraction from PDFs and screenshots (the most common ask)

### Q13. A customer hands you 50,000 mixed PDFs (invoices, POs, forms). Scope the extraction system end to end.

**Answer:**

This is *the* FDE multimodal ask. Scope it as a pipeline with a human-review loop, not a single model call.

```
PDFs ──▶ classify ──▶ route ──▶ extract ──▶ validate ──▶ [pass] ──▶ downstream
         (doc type)   (schema)  (vision +   (arithmetic,   │
                                 schema)     required        │[fail / low-conf]
                                             fields, format) ▼
                                                        human review queue
                                                             │
                                                             ▼ (corrections)
                                                        feedback / eval set
```

Stages:

1. **Classify** each document (`claude-haiku-4-5`, cheap) into a type so you pick the right schema. Don't force one mega-schema across invoices and shipping forms.
2. **Route** to a per-type schema. Convert PDF pages to images (or pass PDF directly — Claude accepts PDF documents natively up to 100 pages on 1M-context models).
3. **Extract** with `claude-sonnet-5` + structured output + the `low_confidence_fields` escape hatch (Q2).
4. **Validate in code:** arithmetic, required-field presence, format/regex (dates, tax IDs), cross-field consistency (ship-to vs bill-to).
5. **Route failures to human review**, and — critically — feed corrections back into your eval set so you can measure improvement and detect regressions.

The numbers to quote:
- **Cost:** ~50,000 docs × ~$0.015/doc (Sonnet 5, multi-page) ≈ **$750 one-time**, batch-halved to ~$375. Trivial. The cost that matters is human review time on the fail bucket.
- **Accuracy:** you will not hit 100%. Design for "95% auto-processed, 5% reviewed" and make the 5% cheap to review (bounding-box overlays, pre-filled fields, one-click correct).

**Interview trap:** "What accuracy can you guarantee?" See Q8 in the scenarios file and Scenario 8 there — you don't guarantee a number, you guarantee a *system* with validation and a review loop, and you report measured accuracy per document type on a held-out set. Promising "99% accuracy" on documents you haven't seen is how you lose the account in month two.

---

### Q14. PDFs vs screenshots — do you handle them differently?

**Answer:**

Yes, subtly.

**PDFs** often have a real text layer. Pass the PDF natively (`{type: "document", source: {type: "base64", media_type: "application/pdf", ...}}`) — the model gets both the rendered pages *and* the embedded text, which grounds transcription and dramatically cuts numeric mis-reads on dense tables. This is strictly better than rasterizing to images and throwing away the text layer. Only rasterize when the PDF is a scanned image with no text layer (then it's effectively a screenshot).

**Screenshots** have no text layer — they're pure pixels. Send as images. Watch resolution: a full-page 4K screenshot downscaled by your capture tool can render small text illegibly. Capture at native resolution; if the UI is dense, tile it and send regions rather than one shrunk-to-fit image (models lose small text when an image is downsampled below the legibility threshold).

The cross-cutting rule: **give the model the highest-fidelity source you have.** Native PDF over rasterized PDF; native-resolution screenshot over a downscaled one; OCR text *alongside* the image, not instead of it.

---

## Part 7 — Multimodal cost and latency: the numbers table

### Q15. Give me a single reference table for multimodal cost and latency to size any project.

**Answer:**

Per-unit cost (input + typical prompt + output), current pricing:

| Task | Model | Per-unit cost | Latency (non-stream) |
|---|---|---|---|
| Single doc-page extraction | Sonnet 5 | ~$0.01–0.02 | ~2–4s |
| Single doc-page extraction (hard) | Opus 4.8 | ~$0.02–0.03 | ~3–6s |
| Doc classification | Haiku 4.5 | ~$0.002–0.004 | ~0.8–1.5s |
| Image vision-QA | Sonnet 5 | ~$0.006–0.012 | ~1.5–3s |
| Chart→description (RAG ingest) | Sonnet 5 | ~$0.01 | ~2–3s (batch it) |
| Voice turn (LLM only) | Sonnet 5 | ~$0.002–0.01 | ~400ms TTFT |

Pipeline latency (voice, streaming, steady-state turn): **~0.8–1.5s** end-of-speech to first-audio (Q9).

Batch discount: **50%** on anything non-latency-sensitive.
Prompt-cache savings on the invariant prefix (schema/system): **~90% on cached tokens** (~0.1× read cost).

Scoping formula to quote:
```
monthly_cost ≈ volume × per_unit_cost × (1 − cache_saving_on_fixed_tokens) × (0.5 if batch)
```

**Interview trap:** the interviewer asks "how much will this cost at 2M documents/month?" Don't guess a round number. Walk the formula: `2,000,000 × $0.015 × ~0.7 (schema cache) × 0.5 (batch) ≈ $10,500/month`, then name the *dominant* cost, which at that volume is usually **human review on the failure bucket**, not model tokens. The engineer who surfaces the human-review cost — not just the token cost — is the one who has actually run a document pipeline.

---

### Q16. What are the top production failure modes specific to multimodal, and how do you defend against each?

**Answer:**

| Failure mode | Symptom | Defense |
|---|---|---|
| Silent transcription errors | `7`→`1`, decimal locale confusion | Arithmetic + format validation in code (Q2) |
| Downsampled illegible text | Random wrong values on dense docs | Send native resolution; tile dense UIs (Q14) |
| Hallucinated absent fields | Model invents a tax ID | `nullable` schema + "use null if absent" + `low_confidence_fields` |
| Voice history desync after barge-in | Bot references unspoken content | Commit only TTS-played prefix to history (Q8) |
| RAG blind to a modality | Fails on chart questions only | Describe-then-embed figures; re-attach images (Q11) |
| Runaway ingest cost | Re-processing whole corpus per prompt tweak | Version prompt; re-run only changed/failed subset (Q12) |
| Approximate bounding boxes | Redaction leaks PII | Use OCR word boxes for coordinates, LLM for semantics (Q3) |
| Sequential latency stacking | Voice bot feels slow despite fast models | Stream + overlap stages, sentence-chunk TTS (Q5, Q9) |

---

### Q17. How do you evaluate a multimodal extraction system so you actually know it works?

**Answer:**

Text-RAG eval habits carry over, but multimodal adds field-level structure you should exploit.

- **Field-level accuracy, not document-level.** "94% of documents perfect" hides that `total` is 99% right and `vendor_tax_id` is 60% right. Score each field independently; the low fields tell you where to add validation or route to review.
- **Held-out set per document type.** Invoices and shipping forms fail differently. A single blended number is uninformative.
- **Include the hard tail deliberately.** Your eval set must oversample the messy scans, the foreign-locale numbers, the multi-page documents — the cases production will actually break on. An eval set of clean documents guarantees a 95% number and a production disaster (Scenario 7 in the case-studies file).
- **Track the validation-catch rate.** How often does your arithmetic/format check catch a model error the eval missed? A rising catch rate means your validators are earning their keep; a validator that never fires is either perfect data or a bug.
- **Cost and latency are eval metrics too.** Track per-doc cost and p95 latency alongside accuracy so a "better" prompt that doubles token spend doesn't ship silently.

**Production war story:** A team reported 95% accuracy and the customer reported it was "constantly wrong." Both were right: the eval set was clean scans from one vendor; production was 40 vendors including faxed, skewed, and handwritten-annotated pages. The fix was rebuilding the eval set from a *stratified sample of real production traffic*, which dropped the measured number to 82% — an honest 82% that they then improved to a real 94% by adding per-vendor handling. **An eval set that doesn't look like production traffic is worse than no eval, because it manufactures false confidence.**

---

### Q18. Put it together: architect a multimodal customer-support agent that reads screenshots, talks, and answers from a visual knowledge base.

**Answer:**

This is the capstone — it exercises vision, voice, and multimodal RAG at once.

```
                          ┌──────────────────────────────────────────┐
  user (voice + screenshot)                                           │
        │                                                             │
        ▼                                                             │
   streaming STT ──▶ transcript ─┐                                    │
                                 ▼                                    │
   screenshot ──▶ Claude vision ──▶ "user's screen shows X, error Y"  │
                                 │                                    │
                                 ▼                                    │
                          [ orchestrator builds query ]              │
                                 │                                    │
                                 ▼                                    │
                    multimodal RAG retrieval                         │
                 (describe-then-embed KB of docs + screenshots)      │
                                 │                                    │
                                 ▼                                    │
                    Claude (sonnet-5) answers, streaming ────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                          ▼
             sentence-chunk TTS         text transcript in UI
                    │
                    ▼
             speaker (barge-in enabled)
```

Design decisions, each tied to an earlier answer:

- **Vision on the screenshot** (Q1–Q2): extract the error state / screen context as structured text so it can join the query. Don't make the user describe their screen.
- **Streaming STT + semantic endpointing** (Q6–Q7): so turn-taking feels natural.
- **Barge-in with played-prefix history** (Q8): the user can interrupt "no, the *other* button" and the bot yields cleanly.
- **Multimodal RAG, describe-then-embed** (Q11): the KB contains annotated screenshots and diagrams, not just text.
- **Sentence-chunked streaming TTS** (Q5): first audio out in <1s.
- **Latency budget** (Q9): the added vision call on the screenshot happens *in parallel* with STT finalization, not in series, so it doesn't blow the budget.
- **Model tiering** (Q4, Q9): Haiku for intent classification, Sonnet 5 for the conversation and screenshot vision, Opus 4.8 only for a genuinely hard troubleshooting turn, routed by a classifier.
- **Cost** (Q15): dominated by the per-turn LLM + the per-session screenshot vision calls; prompt-cache the persona and KB retrieval instructions to keep per-turn TTFT and cost down.

**Interview trap:** the failure is treating this as three separate features glued together. The senior framing is that it's *one latency budget* and *one context* — the screenshot vision, the retrieval, and the conversation all feed the same answer call, and the parallelism between them (vision + STT concurrently) is what keeps it real-time. Draw the parallel edges on the diagram, not just the sequential ones.
