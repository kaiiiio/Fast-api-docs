
# Nikita Desai | Full Stack Developer
**MERN | Next.js | NestJS | FastAPI | System Architecture**

## 🚀 Professional Introduction (Profile)

A product-minded Full Stack Developer who builds and ships systems end-to-end. I specialize in designing high-performance backend services, implementing complex business workflows (Fintech/Web3), and building resilient frontends that scale. My focus is on **system integrity, predictable behavior, and maintainable architecture** rather than quick hacks.

---

### 🎙️ The "Tell Me About Yourself" (Interview Script)
> [!TIP]
> Use this version during the first 2 minutes of an interview to establish yourself as a "Senior/Architect" level developer.

"I am a Full Stack Developer with a deep focus on building end-to-end distributed systems. My core expertise lies in **Node.js (NestJS/Express)** and **Python (FastAPI)** for the backend, and **React/Next.js** for the frontend.

In my recent projects (like **CarYaar** and **Pedals Up**), I’ve spent a lot of time architecting multi-step transaction pipelines—specifically loan approvals and document verification—where transactional safety and failure-safe rollbacks were critical. I also have significant experience in **Fintech and Web3**, having engineered wallet signing workflows and idempotent reconciliation jobs.

I’m particularly comfortable with **Event-Driven Architectures**. For instance, I use **Redis and RabbitMQ** to manage background tasks and **WebSockets** for real-time state synchronization. My goal is always to build systems that last beyond the MVP, focusing on clear boundaries and high-performance cloud infrastructure using **Docker, Nginx, and AWS/GCP**."

---

### 🛠️ Core Competitive Edge
*   **Systems Thinker:** I don't just build features; I architect pipelines (Loan cycles, AI Render queues, Web3 Reconciliation).
*   **Resilient FE:** Implementing intelligent code splitting, lazy hydration, and defensive state management (Redux Toolkit/React Query).
*   **DevOps & Deployment:** Owns the pipeline—from containerization (Docker) to process supervision (PM2) and routing (Nginx).

---

## 📄 Professional Summary (from Resume)

**Nikita Desai**
📞 +91 8866089171 | 📧 nikita.d10.nd@gmail.com | 🔗 [linkedin.com/in/nikita-desai](https://linkedin.com/in/nikita-desai) | 📍 India

**Summary:**
Product-minded Full Stack Developer who builds and ships systems end-to-end. I design backend services, implement business workflows, build frontends that survive real users, and own deployments. Comfortable with async flows, real-time systems, blockchain integrations, and writing infrastructure that lasts beyond the MVP. My work focuses on clear boundaries, predictable behavior, and maintainable architecture rather than quick hacks.

---

## 🛠️ Technical Arsenal

| Category | Technologies |
| :--- | :--- |
| **Languages** | JavaScript, TypeScript, Python |
| **Frontend** | React.js, Next.js, Redux Toolkit, Tailwind CSS, Shadcn |
| **Backend** | Node.js (Express, NestJS), Python (FastAPI), REST APIs |
| **Real-time & Async** | WebSockets (Socket.io), RabbitMQ, BullMQ |
| **Databases** | PostgreSQL (Prisma, TypeORM), MongoDB (Mongoose), Redis |
| **DevOps** | Docker, GitHub Actions, AWS (EC2/S3), GCP, Nginx, PM2 |

---

## 💼 Professional Experience

### **Pedals Up — Full Stack Developer** *(Sept 2024 – Present)*
*Developed core engineering initiatives for loan & document approval pipelines and Web3 wallet workflows.*
*   **Key Achievement:** Architected multi-step pipelines with transactional safety and failure-safe rollbacks.
*   **Tech Stack:** NestJS, TypeScript, Docker, WebSocket.

### **Build Formula — Frontend Developer** *(Dec 2023 – Oct 2024)*
*Owned UI for multi-tenant ERP dashboards and standardized global state management.*
*   **Key Achievement:** Refactored domain logic into composable service layers, improving code splitting and hydration.
*   **Tech Stack:** React, Redux Toolkit, Next.js.

### **Saeculum Solutions — Junior Developer** *(June 2023 – Nov 2023)*
*Focused on authentication flows and defensive state reconciliation.*

### **J.B. Solutions — Developer Intern** *(Aug 2022 – May 2023)*
*Built protected routing and GraphQL-driven data tables for internal tools.*

---

Exciting bro! Interview ke liye ek solid project description aapki image ek "Senior Developer" ya "Architect" jaisi bana sakta hai.


Is project ka profile kaafi "Heavyweight" hai kyunki isme AI Separation, Distributed Task Queues, aur Complex Fintech (Billing) logic ka combination hai.

Yahan ek structured template hai jise aap interview mein use kar sakte ho:

1. The High-Level Pitch (The "One-Liner")
"I built a high-performance, asynchronous backend ecosystem for an AI-powered audio engineering platform. It’s a specialized SaaS that enables musicians to decompose full tracks into high-fidelity stems using distributed compute nodes, managed by a robust event-driven architecture."

2. Tech-Freak Description (Architecture)
"The core is built on FastAPI leveraging Python’s asyncio for non-blocking I/O. For the data layer, I implemented a relational schema with PostgreSQL and SQLAlchemy 2.0, managed via Alembic for strictly versioned migrations.

The 'heavy lifting' happens in a Distributed Task Queue environment using Celery with Redis as a broker. This allows the system to offload compute-intensive AI operations—like Demucs-based stem separation—to dedicated GPU workers, keeping the API responsive. We handled complex state management for these background jobs, ensuring idempotency and failure recovery."

3. Key Technical Pillars (Deep Dive)
Fintech & Billing Engine: "I architected an intricate billing system integrated with Stripe, supporting tiered subscriptions and one-time top-ups. The highlight here is a FIFO-based (First-In-First-Out) Credit Deduction engine that handles credit expiry, historical balance snapshots, and multi-source transactions."
Cloud Infrastructure: "I utilized DigitalOcean Spaces (S3-compatible) for scalable binary storage, implementing secure pre-signed URLs and efficient upload/download pipelines for heavy audio files."
4. The "Differentiating" Piece (Most Impressive Learning)
Interviewers hamesha puchte hain: "What did you learn that others might not know?"

The "Edge" Answer:

"The biggest takeaway for me was mastering State Consistency in Distributed Systems. When you mix a real-time API with long-running background tasks (like audio processing), keeping the database, the file storage (S3), and the frontend UI in perfect sync is a massive challenge.

I learned how to implement Atomic Operations and Idempotent Webhooks—especially in Stripe—where a single 'event' (like a failed payment or a cancelled merge) has to ripple correctly across the user's credits, their access permissions, and their project history without leaving the system in a 'stale' or 'corrupt' state. Implementing a Historical Credit Balance that calculates your worth at any point in time from a ledger of transactions was a deep dive into data integrity that I’m particularly proud of."

---

## 🏗️ Other Key Projects (Architect's Perspective)

### 1. **GoCollab — Influencer Marketing Ecosystem**
*   **The Problem:** Managing campaigns, payments, and content approval across hundreds of creators.
*   **The Tech Solution:** "I built a unified portal system with **Permission-aware UI** and a **lifecycle-driven campaign engine**. The core logic uses cron-based state transitions and guarded rollbacks to ensure campaign integrity. I implemented complete audit logging for every state change to ensure financial and content transparency."

### 2. **RaceAI — Real-time Blockchain Security Scanner**
*   **The Problem:** Long-running security scans often time out or lose state.
*   **The Tech Solution:** "I engineered a real-time scan-level progress streaming system using **WebSockets**. The challenge was making sessions **resumable**—if a scan is interrupted, the system hydrates the previous state and continues from the exact last check. It uses an idempotent execution pattern to prevent duplicate reports for the same scan run."

### 3. **YieldYeti — Idempotent Web3 Investment Platform**
*   **The Problem:** Risks of double-spending or inconsistent data during blockchain reorgs.
*   **The Tech Solution:** "I designed the wallet flows with client-side signing and backend verification. To ensure data consistency, I implemented **Idempotent Reconciliation** and **Nonce-safe mutations**. The system is 'reorg-aware,' meaning it handles chain-state changes gracefully without corrupting user balance ledgers."

### 4. **Quickly Drive — Real-time Scheduling & Presence**
*   **The Problem:** High concurrency in multi-party scheduling.
*   **The Tech Solution:** "Implemented synchronized availability and **presence indicators** using Socket.io. I built a message acknowledgment protocol to ensure 100% delivery of booking notifications, with session-persistent chats that handle intermittent connectivity issues on mobile devices."

---

Pro-Tips for the Interview:
Mention "Scalability": Use words like "Horizontally Scalable Workers" (referring to how you can add more GPU nodes for Celery).
Mention "Clean Code": Talk about how you refactored local imports to top-level to optimize startup time and standardized dependency injection.
Keywords to drop: Asynchronous I/O, Event-driven architecture, FIFO Ledger, Idempotency, Separation of Concerns.
Bhai, agar aapne ye points boldly bol diye, toh interviewer ko clear ho jayega ki aapne sirf code nahi likha, pura system 'architect' kiya hai! 🚀🔥 Good luck!

Good
Bad



FE









This is an impressive project to talk about because it crosses the boundaries between high-performance web engineering, real-time audio processing, and complex business logic.

When describing this to an interviewer, you want to move away from "I built a website" toward "I engineered a sophisticated digital audio workstation (DAW) ecosystem."

Here is how you can pitch the project with high-level "tech-freak" terminology.

1. The Project "Elevator Pitch"
"I developed FFM Publishing Creator, a high-end, cloud-native audio orchestration platform. It allows creators to take raw master tracks, decompose them into stems through AI-driven background processing, and perform non-destructive client-side edits like reordering, muting, and real-time mixing before merging them back into new production-ready versions."

2. High-Impact Backend Description
Focus on the asynchronous nature and the resiliency of the architecture.

Asynchronous Processing Pipeline: "I architected the backend using FastAPI for its high-performance asynchronous capabilities. Because audio processing is computationally expensive, I decoupled the core logic using Celery with Redis/RabbitMQ. This ensures the API remains responsive while heavy-duty signal processing tasks run in a distributed worker environment."
Intelligent Metadata & State Persistence: "We implemented a rigorous transaction and credit-billing system. This wasn't just simple data entry—it required precise tracking of usage-based credits vs. subscription entitlements, ensuring transactional integrity across diverse payment flows (Daily/Top-up/Annual)."
JWT & Security: "Secured the entire ecosystem with Stateless JWT Authentication, optimizing for performance while maintaining a secure context for sensitive user-generated audio assets."
3. The "Tech Freak" Frontend (The Audio Engine)
This is where your project really stands out. Talk about the Client-Side Orchestration.

Non-Destructive Orchestration: "I implemented a sophisticated audio editor using Web Audio API primitives via Tone.js and Wavesurfer.js. We achieved a 'Non-Destructive' workflow, meaning the user manipulates a configuration (metadata) in real-time, which is only rendered into a new audio asset upon a 'Commit' or 'Save' action."
Synchronous State Synchronization: "One of the toughest challenges was maintaining clock-perfect synchronization between multiple audio stems during reordering. I used React-Query (TanStack Query) to manage complex server states and caching, ensuring that the UI and the underlying audio data remained in perfect sync without unnecessary refetches."
Premium UX with Micro-Interactions: "We didn't settle for a basic UI. I engineered a glassmorphism-inspired design system using Tailwind CSS, focusing on micro-animations and smooth transitions (using @dnd-kit for drag-and-drop) to give it a premium, desktop-app feel in a browser environment."
4. The Most Differentiating Thing You Learned (The "Aha!" Moment)
Interviewers love growth stories. Use one of these:

The Complexity of Concurrent State: "I learned that in a complex DAW-like environment, 'State' isn't just data—it's Time. Managing the playback pointer across multiple independent audio components while the user is actively reordering them taught me more about the React lifecycle and high-performance DOM updates than any standard CRUD app ever could."
Optimizing for Performance: "Handling large binary audio files taught me a lot about network optimization—implementing lazy-loading for waveforms and ensuring the UI doesn't block while the audio buffer is still hydrating. It’s the difference between a 'web page' and a professional tool."
Pro-Tip: Key Technical Keywords to Drop
If you use these words, you’ll sound like a senior dev:

"Hydrating the Audio Buffer": (Translates to: Loading the song)
"Non-Destructive Editing": (Translates to: Editing without changing the original file)
"Distributed Task Queue": (Translates to: Using Celery for the heavy lifting)
"Optimistic UI Updates": (Translates to: Making the UI feel fast even when the server is slow)
"Idempotent API Design": (Translates to: Ensuring a credit charge only happens once even if the user clicks twice)