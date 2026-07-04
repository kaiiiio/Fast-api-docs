# Module 08 — AI Engineering (Production GenAI for FDEs)

> Level: Senior/Staff | FDE Interview Prep

This module is the production-grade layer above the basic GenAI notes in `AI-ML/genAI/`. It assumes you already know what tokens, embeddings, transformers, and tutorial RAG are — and covers what a Forward Deployed Engineer actually builds, debugs, and defends in customer environments: hardened LLM API usage, production RAG, vector infrastructure, agents, evals, and the reference architectures you whiteboard with customer architects.

## Files & Study Order

Study in numerical order — each file builds on the previous one.

| # | File | One-line description |
|---|------|----------------------|
| 1 | [01_llm_apis_in_production.md](./01_llm_apis_in_production.md) | Hardened LLM API usage: structured output with retry-with-feedback, tool-calling loops from scratch, streaming/SSE and partial JSON, prompt caching mechanics and cost math, 429 backoff + request queuing, cost engineering and model routing, latency (TTFT) optimization, and when to use a multi-provider gateway. |
| 2 | [02_rag_production_deep_dive.md](./02_rag_production_deep_dive.md) | Beyond tutorial RAG: chunking strategies that matter, hybrid search with RRF in TypeScript, reranking, query transformation (HyDE, multi-query, decomposition), metadata filtering and document-level ACLs, embedding selection, index freshness (deletes!), retrieval/generation evals with worked metric math, and the production failure-modes checklist. |
| 3 | [03_vector_databases.md](./03_vector_databases.md) | How ANN search works (HNSW layered-graph intuition, IVF, PQ compression), exact-vs-approximate trade-offs, pgvector deep dive with real SQL (the FDE default answer), a Pinecone/Qdrant/Weaviate/OpenSearch/Chroma decision table, pre- vs post-filtering and the empty-result trap, scaling memory math, and tenant isolation. |
| 4 | [04_agents_and_tool_use.md](./04_agents_and_tool_use.md) | Agent = LLM + tools + loop: a complete working agent loop in TypeScript (registry, error feedback, budgets), planning patterns (ReAct, plan-then-execute), memory and compaction, multi-agent architectures (when justified vs hype), MCP for integrating customer systems, agent reliability engineering (idempotency, dry-run, approval gates, sandboxing), trajectory evals, and cost/latency control. |
| 5 | [05_evals_and_observability.md](./05_evals_and_observability.md) | Why evals are the FDE's #1 deliverable: golden datasets, LLM-as-judge with bias pitfalls and human calibration, pairwise vs rubric scoring, a full TypeScript eval harness with regression detection and CI gating, online evaluation and A/B testing, tracing LLM systems (spans, PII constraints, LangSmith/Langfuse/OTel GenAI conventions), drift detection, and incident response (prompt rollback, version pinning). |
| 6 | [06_fde_ai_architectures.md](./06_fde_ai_architectures.md) | The five reference architectures an FDE whiteboards with customers — enterprise RAG chatbot with ACLs + citations, document processing pipeline with human review, support copilot with escalation, agentic workflow automation with approval gates, text-to-SQL analytics assistant — each with ASCII diagram, component justification, and failure modes, plus the cross-cutting guardrails/HITL/evals/cost slide and the 6-week PoC value-proof narrative. |

## How to use this module

- **First pass:** read 01 → 06 in order; the Q&A format is designed for active recall — cover the answer and attempt it aloud.
- **Interview warm-up:** re-read every `**Interview trap:**` callout across all six files, then whiteboard the five architectures in file 06 from memory.
- **Coding rounds:** files 01, 02, 04, and 05 contain complete TypeScript implementations (tool loop, RRF, eval harness, backoff queue) worth being able to reproduce from scratch.

## Conventions

- Code is TypeScript throughout; examples use the Claude API (`claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5`) with OpenAI as a secondary reference — the patterns are provider-agnostic.
- Cost math uses list pricing per 1M tokens: opus-4-8 $5/$25, sonnet-5 $3/$15, haiku-4-5 $1/$5.
- Prerequisites: `AI-ML/genAI/01_llm_fundamentals.md` and `AI-ML/genAI/03_rag_architecture_deep_dive.md` for the basics this module deliberately skips.
