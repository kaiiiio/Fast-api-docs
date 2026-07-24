# Advanced RAG and Knowledge Systems - Senior Interview Deep Dive

Plain vector RAG (embed chunks, cosine top-k, stuff into prompt) is the demo. In production for a Forward Deployed Engineer, the interesting problems start when vector RAG *fails*: multi-hop questions, "summarize the whole corpus," tables and charts, freshness, and knowledge that only makes sense as a graph of entities. This file covers the systems you build when top-k-cosine is not enough — GraphRAG, agentic/iterative retrieval, contextual retrieval (the Anthropic prepend + BM25 trick), query routing, structured-data RAG, and the cost/latency budgets that keep it all shippable.

Assume you already know embeddings, chunking, and cosine similarity. This is about the layer above.

---

### Q1. Vector RAG returns the right chunks for "What did we charge Acme in Q3?" but fails on "Which customers churned after a price increase?" Why, and what class of system fixes it?

**Answer:**

The first question is a *lookup* — a single fact lives in one chunk, and semantic similarity finds it. The second is a *multi-hop / aggregation* question: you must (1) find price-increase events, (2) find the customers affected, (3) find churn events, (4) correlate by time. No single chunk contains the answer, and cosine similarity to the query embedding retrieves chunks that *talk about* churn and pricing — not the specific entities linked across documents.

This is the fundamental limitation of flat vector RAG: **it retrieves by semantic similarity to the query, not by relationships between facts.** Similarity ≠ relevance for reasoning tasks.

Three classes of fix, in increasing power/cost:

```
Question type                     Right tool
--------------------------------  ------------------------------------
Single-fact lookup                Vector RAG (top-k cosine)
Keyword/ID/code exact match       BM25 / hybrid (BM25 + vector)
Multi-hop over entities           GraphRAG (entity graph traversal)
"Summarize the whole corpus"      GraphRAG community summaries
Aggregation / counting / joins    Text-to-SQL over structured store
Open-ended "find and correlate"   Agentic RAG (iterative tool calls)
```

The churn question specifically needs either **GraphRAG** (traverse Customer → PriceChange → ChurnEvent edges) or **text-to-SQL** if the data is already relational. The interview signal is recognizing that the *shape of the question* dictates the retrieval architecture — you don't force every question through one pipe.

**Interview trap:** Candidates say "increase top-k." Retrieving 50 chunks instead of 5 does not help multi-hop questions — it adds noise and blows the context budget while still missing the *relationship* that isn't stated in any single chunk. More recall on the wrong axis is not progress.

---

### Q2. Explain GraphRAG end to end. What are the offline indexing stages and what happens at query time?

**Answer:**

GraphRAG (Microsoft's formulation, but the pattern is general) builds a **knowledge graph** from unstructured documents offline, then answers questions by traversing or summarizing that graph. It shines at *global* questions ("what are the main themes across these 10,000 reports?") that vector RAG cannot answer because no chunk contains a global view.

```
OFFLINE INDEXING PIPELINE
=========================

  Documents
     │
     ▼
  [1] Chunk (respect structure — headings, sections)
     │
     ▼
  [2] Entity + relationship extraction (LLM per chunk)
     │   "Acme Corp" --[RAISED_PRICE_ON]--> "Enterprise Plan"
     │   "Acme Corp" --[CHURNED_ON]--> "2026-03-01"
     ▼
  [3] Graph construction + entity resolution
     │   (merge "Acme", "Acme Corp", "Acme Inc." → one node)
     ▼
  [4] Community detection (Leiden/Louvain clustering)
     │   groups densely-connected entities into communities
     ▼
  [5] Community summaries (LLM summarizes each community)
     │   → hierarchical summaries: leaf communities → parent → root
     ▼
  Graph store + summaries + vector index over entities/summaries


QUERY TIME
==========
  Local question ("about Acme")  → find entity → 1-2 hop neighborhood → answer
  Global question ("main themes") → map over community summaries → reduce → answer
```

The two query modes matter:

- **Local search:** find the query's entities, pull their neighborhood (connected entities, relationships, source chunks), synthesize. Great for "tell me everything about X and what it connects to."
- **Global search:** map-reduce over community summaries. Each community summary answers the question partially ("map"), then a final LLM call combines them ("reduce"). This is how you answer "what are the recurring failure modes across all incident reports" — impossible with cosine top-k.

**When GraphRAG beats vector RAG:** global sensemaking, multi-hop entity questions, corpora where relationships carry the meaning (org charts, incident chains, legal precedent, supply chains). **When it loses:** simple lookups (10x the cost for no benefit), rapidly-changing data (graph rebuild is expensive), small corpora (overkill).

**Production war story:** A team put GraphRAG in front of a 400-document policy corpus because a blog post said it was better. Indexing cost ~$180 in LLM calls per full rebuild, queries were 4x slower, and 90% of user questions were single-policy lookups that plain hybrid search nailed. They ripped it out and kept GraphRAG only for the monthly "cross-policy conflict report." Lesson: GraphRAG is a *specialized* tool for global/multi-hop questions, not a default upgrade.

---

### Q3. Show the entity/relationship extraction step in code. How do you make LLM extraction reliable enough to build a graph on?

**Answer:**

The extraction prompt must emit **structured, typed** output and you must validate it. Free-form extraction produces inconsistent entity types and un-mergeable nodes. Use a controlled vocabulary of entity/relationship types and tool-use / JSON schema to constrain output.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Controlled vocabulary — extraction is only reliable if types are constrained.
const ENTITY_TYPES = ["PERSON", "ORG", "PRODUCT", "EVENT", "DATE", "METRIC"] as const;
const REL_TYPES = [
  "EMPLOYED_BY", "RAISED_PRICE_ON", "CHURNED_FROM",
  "ACQUIRED", "PARTNERED_WITH", "OCCURRED_ON", "REPORTED_METRIC",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];
type RelType = (typeof REL_TYPES)[number];

interface Entity {
  name: string;        // canonical surface form
  type: EntityType;
  description: string;  // one line — used later for entity resolution + embedding
}
interface Relationship {
  source: string;      // entity name
  target: string;      // entity name
  type: RelType;
  evidence: string;    // the sentence that supports it — for citations + audits
}
interface Extraction {
  entities: Entity[];
  relationships: Relationship[];
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_extraction",
  description: "Record entities and relationships found in the text.",
  input_schema: {
    type: "object",
    properties: {
      entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ENTITY_TYPES as unknown as string[] },
            description: { type: "string" },
          },
          required: ["name", "type", "description"],
        },
      },
      relationships: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string" },
            target: { type: "string" },
            type: { type: "string", enum: REL_TYPES as unknown as string[] },
            evidence: { type: "string" },
          },
          required: ["source", "target", "type", "evidence"],
        },
      },
    },
    required: ["entities", "relationships"],
  },
};

async function extractGraph(chunk: string): Promise<Extraction> {
  const resp = await client.messages.create({
    model: "claude-sonnet-5",          // Sonnet is the sweet spot: cheaper than Opus, reliable at structured extraction
    max_tokens: 2048,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "record_extraction" }, // force the tool → guaranteed schema
    messages: [
      {
        role: "user",
        content:
          `Extract entities and relationships from the text below. ` +
          `Only use the allowed types. Only record relationships explicitly stated. ` +
          `Do not infer relationships that are not in the text.\n\n<text>\n${chunk}\n</text>`,
      },
    ],
  });

  const toolUse = resp.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("extraction produced no tool_use block");

  const parsed = toolUse.input as Extraction;
  // Defensive validation — never trust model output shape blindly.
  parsed.entities = parsed.entities.filter((e) => ENTITY_TYPES.includes(e.type));
  parsed.relationships = parsed.relationships.filter(
    (r) => REL_TYPES.includes(r.type) && r.source && r.target,
  );
  return parsed;
}
```

Reliability tricks that matter in practice:

1. **Forced tool_choice** guarantees schema-valid JSON — no regex parsing of prose.
2. **Controlled vocabularies** for entity/relationship types so nodes are mergeable later. Free-text types create thousands of near-duplicate edge types.
3. **`evidence` field** on every relationship — you need it for citations and for auditing hallucinated edges.
4. **"Only record explicitly stated"** in the prompt reduces the model inventing plausible-but-false edges, which is the #1 GraphRAG quality killer.
5. **Gleaning** (optional): re-prompt "did you miss any entities?" once — boosts recall ~10-15% at 2x extraction cost.

---

### Q4. After extraction you have "Acme", "Acme Corp", and "Acme Inc." as three nodes. How do you do entity resolution at scale?

**Answer:**

Entity resolution (a.k.a. deduplication / canonicalization) is the make-or-break step. If you don't merge these, graph traversal fragments and every query misses two-thirds of the relevant edges. Three-tier approach, cheap-to-expensive:

```
TIER 1: Deterministic normalization (free, catches ~40%)
  lowercase, strip legal suffixes (Inc|Corp|LLC|Ltd),
  strip punctuation, collapse whitespace
  "Acme Corp" / "Acme Inc." / "ACME" → key "acme"

TIER 2: Embedding similarity blocking (cheap, catches ~40% more)
  embed entity name + description
  cluster by cosine > 0.92 WITHIN same entity type
  (never merge across types — a PRODUCT "Acme" ≠ ORG "Acme")

TIER 3: LLM adjudication (expensive, only for ambiguous pairs)
  for candidate pairs with 0.82 < cosine < 0.92,
  ask the model "same real-world entity? yes/no + reason"
```

```typescript
function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|llc|ltd|co)\b\.?/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface RawEntity extends Entity { embedding: number[]; }

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function resolveEntities(
  entities: RawEntity[],
  adjudicate: (a: RawEntity, b: RawEntity) => Promise<boolean>,
): Promise<Map<string, string>> {
  // returns: entity.name -> canonical id
  const canonical = new Map<string, string>();
  const clusters: RawEntity[][] = [];

  for (const e of entities) {
    const key = normalizeKey(e.name);
    // Tier 1: exact normalized-key match to an existing cluster.
    let placed = false;
    for (const cluster of clusters) {
      if (cluster[0].type !== e.type) continue;           // never cross types
      if (normalizeKey(cluster[0].name) === key) { cluster.push(e); placed = true; break; }
      // Tier 2: embedding block.
      const sim = cosine(cluster[0].embedding, e.embedding);
      if (sim > 0.92) { cluster.push(e); placed = true; break; }
      // Tier 3: ambiguous zone → ask the model.
      if (sim > 0.82 && (await adjudicate(cluster[0], e))) {
        cluster.push(e); placed = true; break;
      }
    }
    if (!placed) clusters.push([e]);
  }

  clusters.forEach((cluster, i) => {
    const canonId = `ent_${i}_${normalizeKey(cluster[0].name).replace(/ /g, "_")}`;
    for (const e of cluster) canonical.set(e.name, canonId);
  });
  return canonical;
}
```

The type guard (`cluster[0].type !== e.type → skip`) is not optional. Merging a PRODUCT and an ORG that share a name corrupts traversal silently — the query "who makes Acme?" starts returning churn events. **Entity resolution bugs are the hardest GraphRAG bugs to diagnose because they degrade quality gradually rather than erroring.**

---

### Q5. Explain Anthropic's Contextual Retrieval. What exactly is prepended, and why does it fix the chunk-isolation problem?

**Answer:**

Standard chunking destroys context. A chunk reading *"The company's revenue grew 3% that quarter"* is useless in isolation — which company? which quarter? Embedding it captures "revenue growth" semantics but loses the *referents*, so retrieval for "Acme Q3 revenue" misses it.

**Contextual Retrieval** (Anthropic, 2024) fixes this by **prepending a short, chunk-specific context blurb generated by an LLM that sees the whole document**, *before* embedding and indexing. The prepended text situates the chunk.

```
Original chunk:
  "The company's revenue grew 3% that quarter."

Contextualized chunk (what actually gets embedded + BM25-indexed):
  "This chunk is from Acme Corp's Q3 2026 10-Q filing, discussing
   segment performance. The company's revenue grew 3% that quarter."
```

The context is generated once per chunk at index time, using the full document as context. Anthropic's reported results: contextual embeddings cut retrieval failure rate by ~35%, and combining **contextual embeddings + contextual BM25** cut it by ~49%. Adding a reranker on top pushed it to ~67%.

The critical cost trick: **prompt caching.** You cache the full document once, then generate context for each of its chunks against the cached document — so you pay full input tokens for the document only once, not once per chunk.

```typescript
async function contextualizeChunk(
  fullDocument: string,
  chunk: string,
): Promise<string> {
  const resp = await client.messages.create({
    model: "claude-haiku-4-5",   // cheapest model — this runs per chunk, keep it cheap
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `<document>\n${fullDocument}\n</document>`,
            // Cache the document: reused across every chunk of this doc.
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text:
              `Here is a chunk from the document above:\n<chunk>\n${chunk}\n</chunk>\n\n` +
              `Give a short (1-2 sentence) context that situates this chunk within ` +
              `the overall document, for search retrieval. Answer only with the context.`,
          },
        ],
      },
    ],
  });
  const ctx = resp.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  return `${ctx.trim()}\n\n${chunk}`;   // prepend, then embed + BM25-index THIS
}
```

**Why BM25 specifically pairs with it:** contextual embeddings help semantic matches; contextual BM25 helps exact-term matches (error codes, IDs, function names, product SKUs) that embeddings famously fumble. The prepended context adds the resolved referents (company name, doc type) as *literal tokens* that BM25 can match. You index the contextualized chunk in *both* a vector index and a BM25 index, retrieve from both, and fuse.

---

### Q6. Show the full hybrid retrieval + fusion pipeline (contextual embeddings + BM25 + reranking).

**Answer:**

```
QUERY
  │
  ├──► Vector search (contextual embeddings)  → top 50 by cosine
  │
  └──► BM25 search (contextual chunks)         → top 50 by BM25
                │
                ▼
        Reciprocal Rank Fusion (RRF)  → merged top 50
                │
                ▼
        Cross-encoder rerank          → top 20 (or top-k for budget)
                │
                ▼
        Deduplicate + context budget  → final chunks into prompt
```

Reciprocal Rank Fusion is the workhorse for combining two ranked lists without needing to normalize incompatible scores (cosine 0-1 vs BM25 unbounded). RRF only uses *rank position*:

```typescript
interface Scored { id: string; text: string; }

// RRF: score = sum over lists of 1/(k + rank). k=60 is the standard constant.
function reciprocalRankFusion(
  lists: Scored[][],
  k = 60,
): Scored[] {
  const scores = new Map<string, { doc: Scored; score: number }>();
  for (const list of lists) {
    list.forEach((doc, rank) => {
      const prev = scores.get(doc.id);
      const inc = 1 / (k + rank + 1);
      if (prev) prev.score += inc;
      else scores.set(doc.id, { doc, score: inc });
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((s) => s.doc);
}

async function hybridRetrieve(
  query: string,
  vectorSearch: (q: string, n: number) => Promise<Scored[]>,
  bm25Search: (q: string, n: number) => Promise<Scored[]>,
  rerank: (q: string, docs: Scored[], topN: number) => Promise<Scored[]>,
  finalK = 20,
): Promise<Scored[]> {
  const [vec, kw] = await Promise.all([
    vectorSearch(query, 50),
    bm25Search(query, 50),
  ]);
  const fused = reciprocalRankFusion([vec, kw]).slice(0, 50);
  // Reranking is where most of the quality gain lives — do NOT skip it.
  return rerank(query, fused, finalK);
}
```

The reranker (a cross-encoder that scores query-document *pairs* jointly, unlike the bi-encoder that embeds them separately) is the single highest-ROI addition to a RAG pipeline. Bi-encoder embeddings are compressed lossy summaries; a cross-encoder reads query and chunk together and catches relevance the embedding missed. **Interview trap:** candidates optimize the embedding model for months when adding a reranker would have doubled precision@5 in a day.

---

### Q7. What is agentic RAG, and how is retrieval-as-a-tool-call different from retrieval-as-a-pipeline-stage?

**Answer:**

In classic RAG, retrieval is a **fixed pipeline stage**: query → retrieve once → generate. The model has no say in *what* or *whether* to retrieve. In **agentic RAG**, retrieval is a **tool the model calls iteratively**, deciding based on what it has learned so far.

```
CLASSIC RAG (one shot)
  query → [retrieve top-k] → [generate] → answer

AGENTIC RAG (loop)
  query → model reasons → maybe call search(q1)
        → sees results → reformulates → call search(q2)
        → still missing a fact → call sql_query(...)
        → has enough → generate answer
```

This directly enables multi-hop: the model retrieves "price increase events," reads them, *then* forms a follow-up query "customers on Enterprise plan in March," retrieves again, and correlates. Each retrieval is conditioned on the previous results — which a single-shot pipeline cannot do.

```typescript
const SEARCH_TOOL: Anthropic.Tool = {
  name: "search_knowledge",
  description:
    "Search the knowledge base. Call multiple times with refined queries " +
    "to gather all facts needed. Prefer specific queries over broad ones.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string" },
      source: { type: "string", enum: ["docs", "tickets", "contracts"] },
    },
    required: ["query"],
  },
};

async function agenticRAG(
  question: string,
  search: (q: string, source: string) => Promise<Scored[]>,
  maxSteps = 6,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  for (let step = 0; step < maxSteps; step++) {
    const resp = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      tools: [SEARCH_TOOL],
      messages,
    });
    messages.push({ role: "assistant", content: resp.content });

    if (resp.stop_reason !== "tool_use") {
      // Model decided it has enough — return its answer.
      return resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text).join("\n");
    }

    // Execute every tool call the model requested this turn (may be several).
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;
      const { query, source = "docs" } = block.input as { query: string; source?: string };
      const hits = await search(query, source);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: hits.map((h, i) => `[${i}] ${h.text}`).join("\n\n"),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }
  return "Could not gather enough information within the step budget.";
}
```

The **cost tradeoff** is real: agentic RAG makes N model calls + N retrievals instead of 1+1. A 4-hop question might cost 8x a single-shot query. So you gate it: route simple lookups to single-shot RAG, only escalate to the agentic loop when the router (Q8) classifies the question as multi-hop or when single-shot retrieval confidence is low. **The `maxSteps` budget is a hard safety rail** — without it, a confused model loops forever burning tokens.

---

### Q8. How do you route a query across multiple knowledge sources (docs, SQL warehouse, API, code)? Show a router.

**Answer:**

A router is a cheap, fast classifier that picks the retrieval strategy *before* spending money on the expensive path. Two implementations: (a) an LLM router (flexible, ~100-300ms), (b) an embedding router (faster, cheaper, less flexible). For most FDE systems the LLM router with the cheapest model wins on flexibility.

```
                    ┌─────────────┐
   query ──────────►│   ROUTER    │  (claude-haiku-4-5, forced tool)
                    └──────┬──────┘
          ┌────────────────┼────────────────┬──────────────┐
          ▼                ▼                 ▼              ▼
    vector RAG        text-to-SQL       graph search   agentic loop
   (doc lookup)   (aggregation/counts)  (multi-hop)   (open-ended)
```

```typescript
type Route = "vector" | "sql" | "graph" | "agentic";

const ROUTER_TOOL: Anthropic.Tool = {
  name: "route",
  description: "Choose the retrieval strategy for a user question.",
  input_schema: {
    type: "object",
    properties: {
      route: {
        type: "string",
        enum: ["vector", "sql", "graph", "agentic"],
        description:
          "vector: single-fact lookup in docs. " +
          "sql: counts, sums, aggregations, filters over structured data. " +
          "graph: multi-hop questions about how entities relate. " +
          "agentic: open-ended questions needing iterative search across sources.",
      },
      reason: { type: "string" },
    },
    required: ["route", "reason"],
  },
};

async function routeQuery(question: string): Promise<Route> {
  const resp = await client.messages.create({
    model: "claude-haiku-4-5",         // routing must be cheap + fast; it's on every query
    max_tokens: 256,
    tools: [ROUTER_TOOL],
    tool_choice: { type: "tool", name: "route" },
    messages: [{ role: "user", content: question }],
  });
  const toolUse = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  return (toolUse?.input as { route: Route })?.route ?? "vector";  // safe default
}
```

Design rules for routers:

1. **Fail safe, not open.** If routing is uncertain, default to the cheapest reasonable path (usually vector), not the most expensive (agentic). A misroute to `agentic` on every query bankrupts you.
2. **Routing latency is user-visible** — it's serial before retrieval. Use the cheapest model and cap `max_tokens`. 100-300ms is acceptable; 2s is not.
3. **Log routes + outcomes.** Router quality is your highest-leverage eval. Misrouting "how many X" to `vector` returns chunks, and the model hallucinates a count from them — the worst failure because it *looks* like an answer.
4. **Consider a semantic-cache/keyword fast path before the LLM router** for the top-20 recurring question shapes — skip the router call entirely.

---

### Q9. A user asks "How many enterprise customers churned in Q2, and what was the total ARR lost?" Walk through text-to-SQL RAG. Why can't you answer this with vector search?

**Answer:**

Vector search retrieves *documents that mention* churn and ARR. It cannot **count** or **sum** — aggregation is a computation over structured rows, not a similarity match. If you feed churn-related chunks to the model and ask "how many," it hallucinates a number from whatever chunks it saw. This is a categorically wrong tool.

The right architecture is **text-to-SQL RAG**: the LLM writes a SQL query against your warehouse, you execute it in a **read-only sandbox**, and you feed the *result rows* back for the model to phrase.

```
question → [LLM writes SQL, given schema] → validate SQL (read-only, allowlist)
         → execute against replica → rows → [LLM phrases answer from rows]
```

```typescript
interface TableSchema { name: string; columns: { name: string; type: string }[]; description: string; }

const SQL_TOOL: Anthropic.Tool = {
  name: "run_sql",
  description: "Run a read-only SQL SELECT query and return rows.",
  input_schema: {
    type: "object",
    properties: { sql: { type: "string", description: "A single read-only SELECT statement." } },
    required: ["sql"],
  },
};

// Hard guard — NEVER trust the model to keep SQL read-only. Enforce it.
function assertReadOnly(sql: string): void {
  const normalized = sql.trim().toLowerCase();
  if (!normalized.startsWith("select") && !normalized.startsWith("with")) {
    throw new Error("only SELECT/WITH queries allowed");
  }
  const forbidden = /\b(insert|update|delete|drop|alter|create|grant|truncate|merge|;.*\S)/;
  if (forbidden.test(normalized)) throw new Error("mutation or multi-statement SQL rejected");
}

async function textToSQL(
  question: string,
  schema: TableSchema[],
  execute: (sql: string) => Promise<Record<string, unknown>[]>,
): Promise<string> {
  const schemaText = schema
    .map((t) => `TABLE ${t.name} (${t.columns.map((c) => `${c.name} ${c.type}`).join(", ")}) -- ${t.description}`)
    .join("\n");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `Schema:\n${schemaText}\n\n` +
        `Question: ${question}\n\n` +
        `Write ONE read-only SQL query to answer it, then call run_sql.`,
    },
  ];

  for (let step = 0; step < 3; step++) {
    const resp = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      tools: [SQL_TOOL],
      messages,
    });
    messages.push({ role: "assistant", content: resp.content });
    if (resp.stop_reason !== "tool_use") {
      return resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    }
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;
      const { sql } = block.input as { sql: string };
      try {
        assertReadOnly(sql);
        const rows = await execute(sql);           // execute against a READ REPLICA, with a statement timeout + row cap
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(rows.slice(0, 100)) });
      } catch (err) {
        // Feed the error back — the model self-corrects its SQL. This retry loop is why we allow 3 steps.
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `ERROR: ${(err as Error).message}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }
  return "Could not produce a valid query.";
}
```

Non-negotiable safety layers: **read-only replica**, **SELECT/WITH allowlist + mutation regex**, **statement timeout**, **row cap**, and **least-privilege DB credentials** (the app user physically cannot write). Never rely on the prompt saying "read only" — enforce at the DB grant level. The error-feedback retry loop is what makes text-to-SQL production-viable: models fix their own syntax/column errors when you hand back the DB error.

**Hybrid text-to-SQL:** the strongest systems combine both — SQL for the aggregation, then vector RAG to pull the *narrative context* ("why did they churn" from ticket notes) for the customers the SQL returned.

---

### Q10. How do you do RAG over tables and charts in PDFs (financial reports, spec sheets)? Standard text extraction destroys them.

**Answer:**

Naive PDF-to-text linearizes a table into garbage — column alignment is lost, numbers detach from headers, and a chart becomes nothing. Three strategies, often combined:

```
Content type       Strategy
-----------------  --------------------------------------------------
Text paragraphs    Standard chunk + embed
Tables             Extract as structured (markdown/HTML) + a text summary
Charts / images    Vision model → text description + extracted data points
Whole-page complex Vision model over the rendered page image (ColPali-style)
```

For tables, embed both a **structural representation** (markdown table, so the model can read it precisely) and an **LLM-generated summary** ("This table shows quarterly revenue by segment for 2024-2026; Enterprise grew fastest"). The summary is what retrieval matches on; the structural table is what the model reasons over.

```typescript
// Turn a chart/table image into retrievable text using a vision-capable model.
async function describeVisualElement(imageBase64: string, mediaType: "image/png" | "image/jpeg"): Promise<string> {
  const resp = await client.messages.create({
    model: "claude-sonnet-5",   // vision-capable
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          {
            type: "text",
            text:
              "This is a table or chart from a document. Output:\n" +
              "1. A one-sentence summary of what it shows.\n" +
              "2. The underlying data as a markdown table (exact numbers, with units).\n" +
              "Do not invent values you cannot read.",
          },
        ],
      },
    ],
  });
  return resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
}
```

The frontier approach (**ColPali / vision-first retrieval**) skips text extraction entirely: render each page to an image, embed the *image* with a multimodal embedding model, and retrieve pages by visual+semantic similarity, then feed the page image to a vision LLM. This wins on documents where layout carries meaning (forms, dense tables, infographics) but costs more in storage and inference. **Interview trap:** claiming "just use a vision model on the whole PDF" — vision inference over hundreds of pages per query is far too slow/expensive; you still need a retrieval step to pick the right pages first.

---

### Q11. Explain multi-hop reasoning failure modes and how you engineer around them.

**Answer:**

Multi-hop questions ("Which of our vendors that we onboarded in 2024 have had a security incident?") require chaining retrievals. Failure modes:

1. **Error compounding:** hop 1 retrieves 80% correct, hop 2 conditioned on hop 1's output inherits its errors, and by hop 4 accuracy has collapsed multiplicatively (0.8⁴ ≈ 0.41).
2. **Lost intermediate context:** the model retrieves the 2024 vendors, then in reformulating for "security incidents" it forgets to constrain to *those* vendors and retrieves all incidents.
3. **Premature termination:** the model answers after hop 1 thinking it's done.

Engineering fixes:

- **Query decomposition:** explicitly ask the model to break the question into sub-questions first, answer each with its own retrieval, then compose. This makes hops inspectable and cacheable.
- **Scratchpad / state tracking:** maintain an explicit list of resolved facts ("vendors onboarded 2024: [A, B, C]") in the conversation so hop 2 is constrained to that set.
- **Verification hop:** after composing an answer, a final retrieval to *verify* the claim against sources.

```typescript
interface SubQuestion { question: string; dependsOn: number[]; }

async function decompose(question: string): Promise<SubQuestion[]> {
  const resp = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [{
      name: "plan",
      description: "Break a complex question into ordered sub-questions.",
      input_schema: {
        type: "object",
        properties: {
          subquestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                dependsOn: { type: "array", items: { type: "number" }, description: "indices of prerequisite sub-questions" },
              },
              required: ["question", "dependsOn"],
            },
          },
        },
        required: ["subquestions"],
      },
    }],
    tool_choice: { type: "tool", name: "plan" },
    messages: [{ role: "user", content: question }],
  });
  const tu = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  return (tu?.input as { subquestions: SubQuestion[] }).subquestions;
}
```

You then execute sub-questions in dependency order, feeding resolved answers into dependents. **Production war story:** a compliance-search tool answered multi-hop questions confidently and wrong ~30% of the time because it did all hops in one context and the model conflated intermediate result sets. Switching to explicit decomposition + a resolved-facts scratchpad cut the error rate to ~8% and, crucially, made every wrong answer *traceable* to a specific hop — turning silent failures into debuggable ones.

---

### Q12. How do you construct and maintain a knowledge graph from a continuously-updated document corpus? Cover schema, merging, and conflicts.

**Answer:**

Building a KG once is a batch job (Q3-Q4). Maintaining it against a live corpus is the hard part. Design decisions:

**Schema:** decide open vs closed. Closed schema (fixed entity/relationship types) gives consistent, queryable graphs but misses novel relationships. Open schema captures everything but produces sprawling, low-quality graphs. Production answer: **closed schema for the types you query on, plus a catch-all `MENTIONS` edge** for everything else you might mine later.

**Provenance on every node/edge:** store `source_doc_id`, `chunk_id`, `extracted_at`, and `evidence`. Without provenance you cannot update (you don't know which edges came from a now-deleted doc) or cite.

**Update flow when a document changes:**

```
Doc v2 arrives
  │
  ├─ Delete all edges/nodes whose provenance == this doc  (tombstone, don't hard-delete shared nodes)
  ├─ Re-extract from v2
  ├─ Entity-resolve new entities against existing graph
  ├─ Insert new edges with new provenance
  └─ Garbage-collect orphaned nodes (no remaining edges)
```

**Conflict handling:** doc A says "Acme CEO is Smith," doc B (newer) says "Acme CEO is Jones." Don't overwrite — store both edges with timestamps and `source`, and resolve at query time with a policy (most-recent-wins, or most-authoritative-source-wins, or surface the conflict). Silently overwriting loses the audit trail and picks arbitrarily.

```typescript
interface Edge {
  id: string;
  source: string; target: string; type: RelType;
  provenance: { docId: string; chunkId: string; extractedAt: string; evidence: string };
  validAt: string;        // when the fact was true (bi-temporal)
}

// When a doc updates, tombstone its edges before re-extracting.
function edgesToRetire(graph: Edge[], updatedDocId: string): Edge[] {
  return graph.filter((e) => e.provenance.docId === updatedDocId);
}

// Query-time conflict resolution: most-recent fact wins, but keep the alternatives visible.
function resolveConflict(edges: Edge[]): { winner: Edge; alternatives: Edge[] } {
  const sorted = [...edges].sort((a, b) => b.validAt.localeCompare(a.validAt));
  return { winner: sorted[0], alternatives: sorted.slice(1) };
}
```

Bi-temporal modeling (`validAt` = when the fact was true, `extractedAt` = when we learned it) matters for anything historical: "who was CEO in 2023" needs the fact valid *then*, not the latest.

---

### Q13. Incremental indexing: how do you handle deletes, updates, and freshness without rebuilding the whole index?

**Answer:**

Full re-indexing on every change is infeasible past a few thousand docs (cost + downtime). You need incremental operations. The core challenge: **a document is many chunks, and chunk boundaries shift when the doc changes**, so you can't naively diff.

**Strategy — content-hash chunk tracking:**

```
Each chunk gets: chunk_id = hash(doc_id + normalized_chunk_text)

On document update:
  new_chunks = chunk(new_version)
  old_chunk_ids = index.getChunkIds(doc_id)
  new_chunk_ids = new_chunks.map(hash)

  to_delete = old_chunk_ids − new_chunk_ids   // gone or changed
  to_add    = new_chunk_ids − old_chunk_ids   // new or changed
  unchanged = old ∩ new                        // skip — no re-embed, no re-cost

  index.delete(to_delete)
  index.upsert(embed(to_add))
```

Only changed chunks get re-embedded — a one-paragraph edit to a 200-chunk document re-embeds 1-2 chunks, not 200.

```typescript
import { createHash } from "node:crypto";

function chunkId(docId: string, chunkText: string): string {
  const normalized = chunkText.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${docId}::${normalized}`).digest("hex").slice(0, 16);
}

interface IndexClient {
  getChunkIds(docId: string): Promise<Set<string>>;
  delete(ids: string[]): Promise<void>;
  upsert(items: { id: string; text: string; embedding: number[] }[]): Promise<void>;
}

async function incrementalReindex(
  docId: string,
  newChunks: string[],
  index: IndexClient,
  embed: (texts: string[]) => Promise<number[][]>,
): Promise<{ added: number; deleted: number; skipped: number }> {
  const oldIds = await index.getChunkIds(docId);
  const newIdMap = new Map(newChunks.map((c) => [chunkId(docId, c), c]));

  const toDelete = [...oldIds].filter((id) => !newIdMap.has(id));
  const toAddEntries = [...newIdMap.entries()].filter(([id]) => !oldIds.has(id));

  if (toDelete.length) await index.delete(toDelete);
  if (toAddEntries.length) {
    const embeddings = await embed(toAddEntries.map(([, text]) => text));
    await index.upsert(toAddEntries.map(([id, text], i) => ({ id, text, embedding: embeddings[i] })));
  }
  return { added: toAddEntries.length, deleted: toDelete.length, skipped: newIdMap.size - toAddEntries.length };
}
```

**Freshness / delete correctness:** the ugly bug is **stale reads after delete**. If you delete from the vector store but the reranker cache or a read replica still serves the old chunk, the model cites deleted content. Mitigations: (1) **soft-delete with a `deleted` filter** applied at query time as a safety net, (2) short TTLs on any downstream cache keyed by chunk_id, (3) for hard-delete-required data (GDPR "right to be forgotten"), verify deletion propagated before confirming to the user. **Interview trap:** forgetting that deletes must also purge derived artifacts — GraphRAG community summaries, semantic caches, and reranker caches all contain copies of chunk content and must be invalidated too.

---

### Q14. What are your retrieval cost and latency budgets, and how do you design to hit them?

**Answer:**

You budget top-down from the user-facing SLO. Say the product needs **p95 < 3s to first token** and **cost < $0.02/query**. Allocate:

```
Latency budget (p95 = 3000ms to first token)
------------------------------------------------
  Router (haiku, capped)          200ms
  Embed query                      50ms
  Vector search                   100ms
  BM25 search (parallel w/ vector)  0ms (overlapped)
  RRF fuse                         10ms
  Rerank (top 50 → 20)            250ms
  Context assembly                 40ms
  Generation TTFT (sonnet)        800ms
  ------------------------------------------------
  Serial total                  ~1450ms  → headroom for tail

Cost budget ($0.02/query)
------------------------------------------------
  Router (haiku, ~500 tok)       ~$0.0005
  Query embedding                 ~$0.00001
  Rerank (50 docs)                ~$0.001
  Generation (2k in / 500 out,
    sonnet, w/ prompt cache)      ~$0.008
  ------------------------------------------------
  Total                          ~$0.010  → within budget
```

Levers when you're over budget:

- **Parallelize** independent retrievals (vector ∥ BM25). Never serialize what can overlap.
- **Prompt caching** on the system prompt + static context: 5-10x cheaper on the cached portion, and faster.
- **Cheaper retrieval, not cheaper generation** first — retrieval quality lets you send *fewer, better* chunks, which cuts generation input tokens (the dominant cost).
- **Smaller top-k after reranking.** A good reranker means 5 chunks beat 20 unranked ones — cheaper *and* better.
- **Semantic cache** (covered in the LLMOps file) for repeated questions — turns a $0.01 query into ~$0.00002.
- **Skip stages by route.** A single-fact lookup doesn't need reranking or the agentic loop.

```typescript
interface Budget { maxLatencyMs: number; maxCostUsd: number; }

// Degrade gracefully: drop the most expensive optional stages when the budget is tight.
function planStages(route: Route, budget: Budget) {
  const stages = { rerank: true, agentic: false, topK: 20 };
  if (budget.maxCostUsd < 0.005) { stages.rerank = false; stages.topK = 5; }   // tight budget → skip rerank
  if (route === "agentic" && budget.maxLatencyMs > 8000) stages.agentic = true; // only allow loop if latency allows
  return stages;
}
```

**Production war story:** a customer-facing RAG assistant hit p99 = 11s because every query ran the full agentic loop "to be safe." Adding a router that sent ~70% of traffic (simple lookups) to single-shot RAG dropped p99 to 2.4s and cut LLM spend 60% — with *no* measurable answer-quality loss on the simple questions. The lesson: budget per query *class*, and spend the expensive path only where it earns its keep.

---

### Q15. When does GraphRAG actually beat vector RAG? Give a concrete decision framework with the tradeoffs.

**Answer:**

```
Dimension              Vector RAG          GraphRAG
---------------------  ------------------  -----------------------------
Best question type     single-fact lookup  multi-hop, global sensemaking
Index cost             low (embed only)    high (LLM extraction + summaries)
Index time             minutes             hours (LLM per chunk)
Query latency          low                 higher (traversal + summaries)
Freshness handling     easy (upsert chunk) hard (re-extract, re-resolve)
"Summarize everything" fails                excels (community summaries)
Exact keyword match    poor (add BM25)     inherits underlying store
Explainability         cited chunks        cited paths (entity → entity)
$ per 1M-token corpus  ~$0.10 (embed)      ~$20-200 (extraction+summaries)
```

**Choose GraphRAG when ALL of these hold:**
1. Questions are genuinely relational/global, not lookups.
2. The corpus is relatively stable (re-indexing is expensive).
3. Relationships between entities carry the meaning (incidents, org data, legal, research).
4. You can afford the indexing cost and the ongoing maintenance complexity.

**Otherwise use hybrid vector + BM25 + reranker.** It solves 80-90% of real RAG needs at a fraction of the cost and operational burden. The honest senior take: **most teams that reach for GraphRAG don't need it** — they have a lookup problem with a reranker-shaped hole, not a graph problem.

The pragmatic middle ground many production systems land on: **hybrid retrieval as the default, GraphRAG or text-to-SQL as routed specializations** for the specific question classes that need them (Q8). You rarely pick one globally.

---

### Q16. How do you evaluate an advanced RAG system? What metrics distinguish retrieval quality from generation quality?

**Answer:**

You must **decompose** eval — a wrong answer can come from bad retrieval *or* bad generation, and they need different fixes. Measure them separately.

```
Retrieval metrics (did we fetch the right context?)
  - Recall@k        : fraction of relevant chunks in top-k
  - Precision@k     : fraction of top-k that are relevant
  - MRR             : rank of the first relevant chunk (1/rank)
  - Context relevance (LLM-judge): are retrieved chunks on-topic?

Generation metrics (given context, was the answer good?)
  - Faithfulness / groundedness: every claim supported by context?
  - Answer relevance: does it address the question?
  - Answer correctness: matches ground truth?

End-to-end
  - Task success rate on a labeled question set
  - Citation accuracy (do cited sources support the claim?)
```

The decomposition diagnoses the bottleneck: **high retrieval recall + low faithfulness → generation problem** (model ignoring or misreading context; fix the prompt/model). **Low recall → retrieval problem** (fix chunking/embedding/reranking; a better generator can't fix missing context).

For multi-hop/agentic systems, add **trajectory eval**: was each hop's query sensible, did it retrieve the right thing, was the composition correct? A right final answer via a lucky wrong path is a latent bug. Log every retrieval and its inputs so you can replay and score trajectories.

Build a **golden set** of 100-300 real questions with labeled relevant docs and reference answers, and run it in CI as a regression gate (covered depth-first in the LLMOps file). **Interview trap:** evaluating only end-to-end answer quality. When it regresses, you have no idea whether retrieval or generation broke — and you'll spend a week bisecting what a decomposed metric would have told you in one run.

---

### Q17. Show how contextual retrieval, hybrid search, and reranking compose into one production indexing + query path.

**Answer:**

Putting Q5-Q6 together into the actual system:

```typescript
// ---------- INDEX TIME ----------
interface IndexedChunk { id: string; docId: string; contextualText: string; embedding: number[]; }

async function indexDocument(
  docId: string,
  fullText: string,
  chunker: (t: string) => string[],
  embed: (texts: string[]) => Promise<number[][]>,
  vectorStore: { upsert: (c: IndexedChunk[]) => Promise<void> },
  bm25Store: { index: (docs: { id: string; text: string }[]) => Promise<void> },
): Promise<void> {
  const rawChunks = chunker(fullText);

  // Contextualize each chunk against the full doc (Q5). Prompt caching makes this affordable.
  const contextualized = await Promise.all(
    rawChunks.map((c) => contextualizeChunk(fullText, c)),
  );

  const ids = contextualized.map((c) => chunkId(docId, c));
  const embeddings = await embed(contextualized);

  // Index the CONTEXTUALIZED text in BOTH stores.
  await vectorStore.upsert(
    contextualized.map((text, i) => ({ id: ids[i], docId, contextualText: text, embedding: embeddings[i] })),
  );
  await bm25Store.index(contextualized.map((text, i) => ({ id: ids[i], text })));
}

// ---------- QUERY TIME ----------
async function answerQuery(
  question: string,
  deps: {
    vectorSearch: (q: string, n: number) => Promise<Scored[]>;
    bm25Search: (q: string, n: number) => Promise<Scored[]>;
    rerank: (q: string, docs: Scored[], n: number) => Promise<Scored[]>;
    generate: (q: string, ctx: Scored[]) => Promise<string>;
  },
): Promise<string> {
  const route = await routeQuery(question);            // Q8
  if (route === "sql" || route === "agentic") {
    // hand off to specialized paths (Q7 / Q9) — omitted here for brevity
  }
  const chunks = await hybridRetrieve(               // Q6: vector ∥ BM25 → RRF → rerank
    question, deps.vectorSearch, deps.bm25Search, deps.rerank, 8,
  );
  return deps.generate(question, chunks);
}
```

This is the reference architecture behind most strong production RAG systems in 2026: **contextual chunks, dual-indexed (vector + BM25), fused with RRF, reranked with a cross-encoder, routed per question class.** Every stage in Q5-Q10 plugs into this skeleton.

---

### Q18. A stakeholder wants to "add all our data" to the RAG system — Slack, email, Notion, the data warehouse, PDFs. How do you scope this as an FDE?

**Answer:**

"Add all our data" is a trap disguised as a requirement. Different sources need fundamentally different retrieval (Q8), have different access controls, and vary wildly in signal-to-noise. Scope it:

1. **Start from questions, not sources.** Get 30 real questions people want answered. That tells you which sources actually matter — often 2 of the 5 carry 90% of the value, and Slack is mostly noise.

2. **Classify each source by retrieval type:**

```
Source            Retrieval strategy         Access control concern
----------------  -------------------------  --------------------------
PDFs / Notion     contextual hybrid RAG      doc-level ACLs
Data warehouse    text-to-SQL                row-level security
Slack             hybrid RAG (heavy filter)  channel membership, DMs = no
Email             hybrid RAG (per-user)      per-user isolation critical
```

3. **Access control is the hard part, not retrieval.** If retrieval doesn't respect per-user permissions, you leak: someone asks a question and gets a chunk from a private channel or another team's contract. **You must filter by the requesting user's permissions at query time** — either pre-filter the index by ACL metadata, or post-filter results. Never index everything into one flat pool that any user can retrieve from.

```typescript
interface RetrievalContext { userId: string; allowedDocIds: Set<string>; allowedChannels: Set<string>; }

// ACL filter applied to every retrieval — permissions enforced at query time, per user.
function enforceAcl(results: (Scored & { docId: string; channel?: string })[], ctx: RetrievalContext) {
  return results.filter(
    (r) => ctx.allowedDocIds.has(r.docId) && (!r.channel || ctx.allowedChannels.has(r.channel)),
  );
}
```

4. **Freshness and volume per source.** Slack generates millions of low-value messages; indexing all of it is expensive and hurts precision. Filter aggressively (drop reactions, bot messages, off-topic channels).

5. **Deliver incrementally.** Ship the 2 high-value sources first, prove it, then expand. A phased rollout beats a 6-month "index everything" project that stalls.

**Production war story:** a team indexed all of Slack into a company-wide assistant without per-channel ACLs. Within a day someone asked an HR question and retrieved fragments from a private compensation channel. The system was pulled offline for two weeks for a security review. **Access control is not a phase-2 feature for RAG over internal data — it's a launch blocker.** Design the ACL filter before the first chunk is indexed.

---

### Q19. How do you keep retrieved context grounded and prevent the model from answering beyond what was retrieved?

**Answer:**

Even with perfect retrieval, models blend retrieved context with parametric knowledge and answer confidently about things not in the context. For RAG over authoritative internal data, this is dangerous — you want "I don't know" over a plausible fabrication. Techniques:

1. **Explicit grounding instruction** in the system prompt: "Answer only from the provided context. If the context does not contain the answer, say you don't have that information. Do not use outside knowledge."

2. **Require citations** — every claim tagged with the source chunk it came from. This structurally forces grounding; a claim with no citable source is flagged.

3. **Faithfulness check** (post-generation LLM-judge or NLI model): does each sentence follow from the cited context? Reject/regenerate if not.

```typescript
async function generateGrounded(question: string, chunks: Scored[]): Promise<{ answer: string; grounded: boolean }> {
  const context = chunks.map((c, i) => `[${i}] ${c.text}`).join("\n\n");
  const resp = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "Answer ONLY from the numbered context. Cite the source index like [2] after each claim. " +
      "If the context does not contain the answer, respond exactly: \"I don't have that information.\" " +
      "Never use knowledge outside the provided context.",
    messages: [{ role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` }],
  });
  const answer = resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");

  // Cheap heuristic gate: a substantive answer with no citation is suspect.
  const hasCitation = /\[\d+\]/.test(answer);
  const isIDK = answer.includes("I don't have that information");
  return { answer, grounded: isIDK || hasCitation };
}
```

4. **Tune retrieval to return "nothing" when appropriate.** If the top reranked score is below a threshold, don't send low-relevance chunks — trigger the "I don't know" path. Feeding garbage context guarantees a garbage-grounded answer.

**Interview trap:** trusting the grounding instruction alone. Prompts reduce ungrounded answers but don't eliminate them — you need the citation requirement *and* a faithfulness gate for anything high-stakes (legal, medical, financial). Defense in depth: instruction + citations + judge + retrieval-confidence threshold.

---

### Q20. Compare embedding-based, keyword, and LLM-reranking retrieval for a code-search use case. Which wins and why?

**Answer:**

Code search is a great case study because it breaks naive embedding RAG. A developer searches for `parseAuthToken` or error `ECONNRESET` — these are **exact identifiers**, and embeddings are notoriously bad at exact-token matching (they map `parseAuthToken` and `validateSession` close together because both are "auth-ish").

```
Query type                   Best retriever
---------------------------  ---------------------------------
Exact symbol / error code    BM25 / keyword (embeddings fumble)
"where do we handle retries"  embedding (semantic intent)
"code similar to this func"   embedding (structural semantics)
Mixed / natural language      hybrid (BM25 + embedding) + rerank
```

The winner for a real code-search product is **hybrid + reranker**, but weighted toward BM25 for identifier-heavy queries. Specifics that matter:

1. **Chunk by structure, not fixed size.** Chunk at function/class boundaries with the signature + docstring, not arbitrary 500-token windows that split a function mid-body.
2. **Enrich chunks with a natural-language summary** ("This function validates JWT auth tokens and refreshes expired ones") — embed the summary + code so both intent queries and code queries hit. This is contextual retrieval (Q5) applied to code.
3. **BM25 on the raw code** so identifiers match exactly.
4. **Rerank** to combine — the cross-encoder reads the query and code together and correctly ranks the exact match above the semantic near-miss.

**Interview trap:** "just use a code-specific embedding model." Better code embeddings help the semantic axis but *still* underperform BM25 on exact-identifier lookup — the failure is inherent to dense vectors, not the model. The reranked hybrid is what ships. This generalizes: **any domain with exact-match tokens (SKUs, IDs, legal citations, part numbers) needs BM25 in the mix; embeddings alone will quietly miss the exact hits your users care about most.**

---

### Q21. How do you handle a query that spans multiple knowledge sources requiring both structured and unstructured data? Give the full architecture.

**Answer:**

Example: *"For our top 5 accounts by ARR, summarize their open support issues and any contract renewal risks."* This needs: (1) SQL for top-5-by-ARR, (2) vector RAG over support tickets, (3) vector RAG over contract docs, (4) synthesis. This is **agentic RAG orchestrating multiple routed retrievers**.

```
                       ┌──────────────────────┐
   question ──────────►│   ORCHESTRATOR       │ (agentic loop, Q7)
                       │   with 3 tools:      │
                       └──────────┬───────────┘
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
        run_sql(top5)      search_tickets()    search_contracts()
        (text-to-SQL)      (hybrid RAG)         (hybrid RAG)
              │                   │                   │
              └───────────────────┴───────────────────┘
                                  ▼
                        synthesize final answer
```

The orchestrator (agentic loop) exposes all three retrievers as tools and lets the model sequence them: first `run_sql` to get the 5 account IDs, then loop `search_tickets` and `search_contracts` *for each account* (constrained by the IDs it just learned). This is multi-hop (Q11) across heterogeneous sources.

```typescript
const TOOLS: Anthropic.Tool[] = [
  { name: "run_sql", description: "Query structured warehouse data (accounts, ARR, renewals).", input_schema: { type: "object", properties: { sql: { type: "string" } }, required: ["sql"] } },
  { name: "search_tickets", description: "Search support tickets. Filter by accountId.", input_schema: { type: "object", properties: { query: { type: "string" }, accountId: { type: "string" } }, required: ["query"] } },
  { name: "search_contracts", description: "Search contract documents. Filter by accountId.", input_schema: { type: "object", properties: { query: { type: "string" }, accountId: { type: "string" } }, required: ["query"] } },
];

async function orchestrate(
  question: string,
  handlers: Record<string, (input: any) => Promise<string>>,
  maxSteps = 10,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];
  for (let step = 0; step < maxSteps; step++) {
    const resp = await client.messages.create({ model: "claude-sonnet-5", max_tokens: 2048, tools: TOOLS, messages });
    messages.push({ role: "assistant", content: resp.content });
    if (resp.stop_reason !== "tool_use") {
      return resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;
      const out = await handlers[block.name](block.input);   // dispatch to run_sql / search_tickets / search_contracts
      results.push({ type: "tool_result", tool_use_id: block.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }
  return "Exceeded step budget.";
}
```

Key design points: (1) each tool enforces its own ACLs (Q18) and read-only safety (Q9); (2) the `accountId` filter on the RAG tools is what constrains hop-2 retrieval to the accounts SQL returned (avoiding the lost-context failure of Q11); (3) `maxSteps` bounds cost — a 5-account query with 2 retrievals each is ~11 model calls, so budget accordingly (Q14). This orchestration pattern — **SQL for facts + RAG for narrative, sequenced by an agent** — is the most common shape for real "business intelligence over mixed data" FDE deliverables.

---

### Q22. What's the single most impactful thing you can do to improve a mediocre RAG system, and how do you decide where to spend effort?

**Answer:**

**Diagnose before optimizing** — measure retrieval vs generation separately (Q16), then attack the proven bottleneck. But if forced to name the highest-ROI single change across the most systems: **add a reranker.** It's a day of work and typically the largest precision jump you'll get, because most mediocre systems retrieve *roughly* right chunks but rank noise above signal, and stuffing 20 mediocre chunks in the prompt both costs more and confuses the model.

A prioritized effort ladder, roughly in ROI order:

```
Effort           Typical impact   When it's the answer
---------------  ---------------  --------------------------------------
Add reranker     high             precision@k is low, recall is okay
Add BM25/hybrid  high             exact-term queries miss (IDs, codes)
Contextual chunk high             chunks are ambiguous out of context
Fix chunking     medium-high      chunks split mid-thought / mid-table
Better prompt    medium           faithfulness low, retrieval fine
Query rewriting  medium           user queries are terse/ambiguous
Fine-tune embed  medium           domain vocab; niche; slow ROI
GraphRAG         situational      only for global/multi-hop questions
Bigger LLM       low              rarely the retrieval bottleneck
```

The decision rule: **run the golden-set eval, look at the decomposed metrics, and spend on whichever number is worst.** Low recall → retrieval stack (rerank, hybrid, chunking). High recall + low faithfulness → generation (prompt, grounding, model). Don't guess.

**Production war story:** a team spent six weeks fine-tuning a custom embedding model to fix a "bad RAG" complaint, moving recall@10 from 71% to 74%. The actual problem, revealed by finally decomposing the eval, was faithfulness: retrieval was fine, but the generation prompt let the model freelance with parametric knowledge. A one-paragraph grounding instruction plus a citation requirement (Q19) fixed user-visible quality in an afternoon. **The most expensive mistake in RAG is optimizing the wrong stage — always decompose the metric before you spend the sprint.**
