# How Would You Debug a Slow Query?

## 1. Identify the Query

- **Logs**: Check `SlowQueryLogger` (configured in Observability).
- **APM**: Check Datadog/New Relic "Database" tab.
- **DB Stats**: `pg_stat_statements` in Postgres shows top consumers.

---

## 2. Analyze the Plan (`EXPLAIN ANALYZE`)

Run the query with `EXPLAIN ANALYZE`.

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'bob@example.com';
```

**Red Flags**:
1.  **Seq Scan (Sequential Scan)**: Reading the whole table. Missing Index?
2.  **External Sort**: Sorting on disk because RAM (`work_mem`) is full.
3.  **Nested Loop Join**: Bad for large datasets.

---

## 3. Fixes

1.  **Add Index**: `CREATE INDEX idx_email ON users(email)`.
2.  **Rewrite Query**:
    - Avoid `SELECT *`. Select only needed columns.
    - Avoid `OR`. Use `UNION`.
    - Avoid `%term%` (Leading wildcard). Use Full Text Search.
3.  **Partitioning**: If table is 1TB, split it by Year.
4.  **Caching**: If query is read often but changes rarely, put it in Redis.

---

## 4. Application Side

- **N+1 Problem**: Are you fetching a list and then doing 1 query per item? Use `JOIN FETCH` or `@EntityGraph`.
- **Connection Pool**: Is the app waiting for a connection? Increase pool size.
