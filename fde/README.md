# Forward Deployed Engineer (FDE) Knowledge Base

Senior-level interview prep and field knowledge for the FDE role — the hybrid of software engineer, solutions architect, and AI engineer that goes into customer environments to build and prove value.

This folder covers everything **beyond MERN** (frontend/MERN is in `frontend-knowledge-base/`, DevOps/AWS in `Devops/`, GenAI basics in `AI-ML/`).

## Modules

| # | Module | What it covers | Interview round it targets |
|---|--------|----------------|---------------------------|
| 01 | [Advanced Node.js](01-Advanced-NodeJS/) | Runtime internals, V8, libuv, streams, workers, memory, HTTP internals | Coding + "explain how it works" probes |
| 02 | [LLD & Design Patterns](02-LLD-Design-Patterns/) | SOLID, all GoF patterns in TS, solved LLD problems (rate limiter, parking lot, notification system, cache, Splitwise, logger) | LLD round |
| 03 | [Machine Coding](03-Machine-Coding/) | Working implementations: Redis clone, rate limiters, LRU/LFU, pub/sub, job scheduler, circuit breaker | Machine coding round (45–60 min) |
| 04 | [System Design HLD](04-System-Design-HLD/) | Building blocks, estimation, framework + 10 solved designs (incl. multi-tenant Calendly, payments, Uber, WhatsApp) | HLD round |
| 05 | [Distributed Systems](05-Distributed-Systems/) | CAP/PACELC, replication, partitioning, consensus (Raft), sagas, Kafka/RabbitMQ/SQS, clocks, failure patterns | HLD deep-dive grilling |
| 06 | [Databases Deep Dive](06-Databases-Deep-Dive/) | Postgres internals (MVCC, WAL), indexing, isolation levels, MongoDB internals, scaling patterns, DB selection | Backend depth probes |
| 07 | [Security](07-Security/) | AuthN/JWT/OAuth2/OIDC, authz & multi-tenancy, OWASP with Node examples, secrets/encryption, AI guardrails | Security probes + FDE trust filter |
| 08 | [AI Engineering](08-AI-Engineering/) | Production LLM APIs, production RAG, vector DBs, agents & MCP, evals & observability, FDE reference architectures | AI/architecture round |
| 09 | [FDE Playbook](09-FDE-Playbook/) | Role & interview loops, customer discovery, PoC delivery, whiteboarding, behavioral stories, MERN→FDE transition plan | Behavioral + customer-scenario round |

## Suggested order (8-month plan)

1. **Month 1** — 01 Advanced Node.js (+ your existing MERN base)
2. **Month 2** — 02 LLD + 03 Machine Coding (drill under time pressure)
3. **Month 3** — 04 HLD + 05 Distributed Systems
4. **Month 4** — `Devops/` folder (Docker, K8s, CI/CD, monitoring) + 06 Databases
5. **Month 5** — `Devops/AWS/` + 07 Security
6. **Month 6** — 08 AI Engineering (+ `AI-ML/` basics as prerequisite)
7. **Month 7** — 09 FDE Playbook + flagship portfolio projects
8. **Month 8** — Mock interviews, drill machine coding + HLD end to end

## The three pillars (per AWS FDE guidance)

1. **Application Development** → modules 01–03, 06
2. **DevOps** → `Devops/` folder + module 07
3. **AI/ML/GenAI** → module 08 + `AI-ML/` folder

Pillar 4 that actually closes offers: **customer skills** → module 09.
