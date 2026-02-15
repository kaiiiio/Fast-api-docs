# Nikita Desai | Full Stack Engineer
**Product-Minded Architect | MERN | Next.js | NestJS | FastAPI | Web3**

End-to-end engineer specializing in high-performance backends (Node/Python), complex business pipelines (Fintech/AI), and resilient frontends. I architect systems for scale, focusing on **idempotency, state consistency, and distributed task management**.

---

## 🛠️ Technical Arsenal

| Category | technologies |
| :--- | :--- |
| **Languages** | JavaScript, TypeScript, Python, SQL |
| **Core** | Node.js (NestJS, Express), Python (FastAPI), React/Next.js |
| **State & Async** | Redux Toolkit, React Query, WebSockets (Socket.io), BullMQ, Celery |
| **Databases** | PostgreSQL (TypeORM/Prisma), MongoDB (Mongoose), Redis |
| **Infra** | Docker, Nginx, PM2, AWS (EC2/S3), GCP, GitHub Actions |

---

## 💼 Professional Experience

### **Pedals Up — Full Stack Developer** *(Sept 2024 – Present)*
- Led core engineering for production systems; architected multi-step loan pipelines with transactional rollbacks.
- Implemented Web3 wallet workflows (client-side signing, backend verification, reconciliation).
- Built WebSocket job feedback with auto-resume and consistent state hydration.

### **Build Formula — Frontend Developer / Mentor** *(Dec 2023 – Oct 2024)*
- Owned UI for multi-tenant ERP; refactored domain logic into service layers, accelerating onboarding.
- Spearheaded development and **trained juniors**, standardizing Redux Toolkit patterns and CI/CD.
- Implemented smart code splitting and lazy hydration, improving performance on slow networks.

### **Saeculum Solutions & J.B. Solutions** *(2022 – 2023)*
- Focused on authentication flows, GraphQL-driven data tables, and defensive state reconciliation.

---

## 🚀 The Project Deck (Deep Dives)

### 1. **FFM — AI Audio Publishing & Billing**
*High-end DAW-like ecosystem for AI music creation and publishing.*
- **AI Stems & Remixing:** Built a multi-track editor using **Web Audio API** and **Tone.js**. Engineered a non-destructive merging service in Python with **AOP-based audit logging** (using Interceptors to decouple cross-cutting concerns from core business logic).

- **Inference Pipeline:** Integrated **Suno AI** workflows via **Redpanda (Kafka-compatible)** stream processing for resilient vocal separation and audio extension.
- **Fintech (Stripe):** Architected a **batch-based FIFO Credit Engine**. Implemented idempotent webhooks with **Link (one-tap payment)** support and **Dynamic Price Generation** to automate plan scaling without manual catalog updates.

### 2. **FastAPI Backend (BE) — Blockchain Wrapper**
*Scalable middleware for high-concurrency blockchain interactions.*
- **Web3 Integration:** Designed a wrapper to handle **Wallet Connect** and on-chain signing. Implemented idempotent reconciliation and nonce-safe mutations to survive network reorgs.
- **DB Structure:** Optimized PostgreSQL schema for traceable transactional history and audit logging across multiple blockchains.

### 3. **Royal Mega — NestJS Telegram Gaming Bot**
*Multiplayer interactive gaming system with wallet-linked winnings.*
- **Bot logic:** Built a Telegram bot using **Javascript**, managing live game state, persistent user sessions, and command-driven execution.
- **Betting Engine:** Designed transactional balance mutations (bet placement -> result calculation -> payout) with atomic operations to prevent double-spending.

### 4. **Quickly Drive — Real-time Chat & Scheduling**
*Multi-party booking system for driving schools.*
- **Messaging:** Built a session-persistent chat system using **Socket.io** with a message acknowledgment protocol to ensure 100% delivery reliability.
- **Presence:** Implemented real-time presence indicators and synchronized availability calendars for high-concurrency scheduling.

### 5. **Google Ads — Marketing Content Redirection**
- **JS Injection:** Developed lightweight JS scripts for existing websites to intelligently redirect users to dynamic landing pages based on campaign metadata, improving conversion rates by 25%.

### 6. **Debtray — System Modernization**
- **Upgrade Path:** Spearheaded the version upgrade and maintenance of a legacy system, refactoring tight coupling into modular components without downtime.

---

## 🛡️ Advanced Patterns & Interview QA

### **Stripe Integration: The "Senior" Level View**
> [!IMPORTANT]
> **Q: How do you handle "Partial Failures" (e.g., Stripe charges user, but your DB fails to add credits)?**
> **A:** I implement **Eventual Consistency** (guaranteeing systems sync over time) via **Idempotent Webhooks** (ensuring duplicate events result in a single state change). I track Stripe `event_id` in a `PaymentEvents` log. If the logic fails mid-way, Stripe retries the webhook; my handler recovers by checking the log. For critical mismatches, I use a **daily Reconciliation script** that syncs the local Ledger with Stripe's `BalanceTransactions` API.

> [!TIP]
> **Q: How do you handle credit expiry in a subscription model?**
> **A:** I use a **Batch-Deduction pattern**. Credits are stored in batches with an `expiry_date` matching the Stripe period end. The deduction logic (FIFO) always consumes from the batch with the *earliest* expiry first, ensuring users utilize their subscription credits before their top-ups.

### **NestJS Deep Dive (from Royal Mega)**
- **Global Pipes:** Standardized DTO validation with `ValidationPipe`, stripping unknown properties and auto-transforming types (e.g., string params to numbers).
- **Exception Filters:** Implemented a global `AllExceptionsFilter` to catch raw errors and return formatted, user-friendly JSON responses without exposing internal stack traces.
- **BigInt Serialization:** Solved the `BigInt toJSON` issue by modifying the prototype globally at the entry point (`main.ts`), ensuring blockchain transaction balances serialize correctly.
- **Security:** Hardened the API with `Helmet`, `CORS` whitelisting (regex-based for subdomains), and `basicAuth` protection for Swagger documentation.

---
*Mentored juniors at **Build Formula**, promoted clean code (Atomic Design, SOLID), and managed release workflows using Docker/PM2.*