# Tradeoffs: SQL vs MongoDB for AI Apps

## 1. The Scenario

You are building an AI app (e.g., Chatbot history, Document storage).

---

## 2. MongoDB (The Winner for AI?)

**Pros**:
- **Flexible Schema**: AI output is unpredictable JSON. Storing it in SQL requires complex tables or a `JSONB` column. MongoDB handles it natively.
- **Vector Search**: Atlas has built-in vector search.
- **Speed**: Faster writes (no transaction overhead by default).

**Cons**:
- **Joins**: `$lookup` is painful.
- **Transactions**: Supported but slower than SQL.

---

## 3. PostgreSQL (The Reliable Choice)

**Pros**:
- **pgvector**: Turns Postgres into a Vector DB.
- **Relational Data**: Users, Subscriptions, Payments fit better in SQL.
- **ACID**: Guaranteed consistency.

**Cons**:
- **Schema Migrations**: Adding a field requires `ALTER TABLE`.
- **Scaling**: Harder to shard than MongoDB.

---

## 4. The Verdict

**Use MongoDB if**:
- You store massive amounts of unstructured logs/chat history.
- You need high write throughput (IoT/Logging).

**Use PostgreSQL if**:
- You need complex relationships (Users <-> Roles <-> Orgs).
- You want a "Single Source of Truth" (Relational + Vector in one DB).
- You are already using Postgres.

**Hybrid**:
- Postgres for Users/Payments.
- MongoDB for Chat Logs/Embeddings.
