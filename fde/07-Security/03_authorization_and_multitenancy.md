# Authorization & Multi-Tenancy — Senior/Staff FDE Interview Prep

Authentication tells you *who* is calling; authorization decides *what they may do* — and in customer-facing deployments it is where almost every real incident happens (Broken Object Level Authorization has topped the OWASP API Top 10 for years). As a Forward Deployed Engineer you will design permission models against messy enterprise org charts, wire tenant isolation through app code *and* the database, and defend both in security reviews. This file covers RBAC/ABAC/ReBAC and Zanzibar, a working TypeScript policy engine, Postgres Row-Level Security with its real footguns, tenant propagation via AsyncLocalStorage, IDOR/BOLA, API key hygiene, and service-to-service identity with mTLS/SPIFFE.

---

### Q1. Compare RBAC, ABAC, and ReBAC. When does each fit, and where does each break down?

**Answer:**

| Model | Core idea | Question it answers well | Breaks down when |
|---|---|---|---|
| **RBAC** (Role-Based) | Users get **roles**; roles get **permissions** (verbs on resource *types*) | "Can editors publish articles?" | You need per-*object* answers ("can Alice edit *this* doc?") → role explosion |
| **ABAC** (Attribute-Based) | Policy = boolean expression over **attributes** of subject, resource, action, environment | "Can a user in dept=finance read invoices where invoice.dept=finance during business hours?" | Policies become an unauditable pile of conditions; "who can access X?" (reverse lookup) is hard |
| **ReBAC** (Relationship-Based) | Permissions derive from a **graph of relationships** between subjects and objects (owner, parent folder, team member) | "Can Alice view doc:9 because she's in a group that's a viewer of the parent folder?" | Overkill for flat permission needs; requires a dedicated tuple store + consistency story |

- **RBAC** is the 80% solution: small, auditable, easy to explain to a customer's security team. Its failure mode is *role explosion* — `project_42_viewer`, `project_43_viewer`… once roles are minted per object, you've reinvented ReBAC badly.
- **ABAC** shines for *contextual* rules (region, classification, device posture, time). NIST 800-162 formalizes it; AWS IAM condition keys are ABAC in the wild. Weakness: evaluation requires fetching attributes at decision time, and auditing "who has access to what" means solving the policy for all subjects.
- **ReBAC** models what enterprises actually have: hierarchies (folders, orgs, teams) where access flows through relationships. Google Zanzibar (Docs/Drive/YouTube), OpenFGA, and SpiceDB are the reference implementations.

Real systems are hybrids: **roles as relationships** (ReBAC tuple `user:alice member org:acme#admins`) plus **ABAC-style conditions** layered on top (OpenFGA conditional tuples, SpiceDB caveats).

**Interview trap:** "We use RBAC, so we're safe from IDOR." False. RBAC answers *type-level* questions ("editors can edit documents"). IDOR/BOLA is an *object-level* failure — an editor editing someone *else's* document. RBAC without object/tenant scoping does nothing against BOLA (see Q11).

---

### Q2. Explain Google Zanzibar's data model: relation tuples and userset rewrites.

**Answer:**

Zanzibar (Google, USENIX ATC 2019) stores authorization state as **relation tuples**:

```text
<object>#<relation>@<user>

document:readme#owner@user:alice           -- alice owns document:readme
document:readme#viewer@group:eng#member    -- members of group:eng can view (a "userset" subject)
folder:root#parent@document:readme         -- structural relationship
```

Three tuple shapes matter: **direct user** (`...@user:alice`), **userset as subject** (`...@group:eng#member` — "whoever satisfies `group:eng#member` gets this relation"; this single indirection level enables groups-of-groups and inheritance), and **wildcard** (`...@user:*` for public access).

**Userset rewrites** are per-relation rules in the namespace config that compute a relation as an *expression* over other relations, so you don't store redundant tuples:

```text
relation viewer:
  union {
    this                          # tuples written directly on viewer
    computed_userset { editor }   # every editor is also a viewer
    tuple_to_userset {            # walk to parent folder, take ITS viewers
      tupleset: parent
      computed_userset: viewer
    }
  }
```

`this` = directly written tuples; `computed_userset` = relation implication on the *same* object (editor ⊆ viewer); `tuple_to_userset` = the hierarchy walk — "find the object's `parent`, then evaluate `viewer` on it," which is how a folder's viewers cascade to every document inside without a tuple per document.

A check for `(user:alice, viewer, document:readme)` is **graph reachability**: expand the rewrite tree, recursing through usersets, until a direct tuple for alice is found (allow) or the graph is exhausted (deny). Zanzibar evaluates branches concurrently and caches subproblems (the "Leopard" index for deeply nested groups).

```text
Check(user:alice, viewer, document:readme)
                    |
        union (rewrite for viewer)
       /            |               \
   this        computed_userset   tuple_to_userset(parent->viewer)
 (direct        (editor on         |
  viewer         document:readme)  parent = folder:eng
  tuples?)          |              Check(alice, viewer, folder:eng)
   no               no                |
                                   this: folder:eng#viewer@group:eng#member
                                      |
                                   Check(alice, member, group:eng)
                                      |
                                   direct tuple -> ALLOW
```

---

### Q3. What does the Zanzibar Check API look like, and what problem do zookies solve?

**Answer:**

The core APIs: **Check** (is subject S related to object O via relation R? → allow/deny), **Read/Write** (tuples, with optimistic concurrency), **Expand** (return the full userset tree for object#relation — needed for "who has access?" UIs and audits), **Watch** (change stream for secondary indexes).

**The consistency problem — "new enemy":** Zanzibar is globally replicated (built on Spanner); reads are served from replicas that may lag. Two failure orderings define the *new enemy problem*:

1. Alice removes Bob from a doc's ACL, *then* adds sensitive content. A stale Check might still see Bob's old tuple → Bob reads content added after his removal.
2. Neglecting the *order* of two ACL changes (remove user from group, then add group to doc) can combine stale and fresh state into an access nobody ever granted.

**Zookies** are the fix: an opaque, encoded timestamp (Spanner commit timestamp) returned from a Write. The client stores the zookie *with the protected content version*. On Check, the client passes the zookie, and Zanzibar guarantees the evaluation snapshot is **at least as fresh** as that timestamp — while remaining free to serve from any cache/replica satisfying the bound. You get "external consistency where it matters" without strongly-consistent reads on every check.

OpenFGA's analogue is `consistency: HIGHER_CONSISTENCY` on Check (latency cost) versus default eventually-consistent, cache-served checks.

**Interview trap:** "Just make every Check strongly consistent." Zanzibar served ~10M checks/sec at Google; strong reads on every check would destroy latency and hot-spot storage. The insight worth saying aloud: consistency requirements are *per content version*, so a client-carried token (zookie) lets the vast majority of checks hit caches safely.

---

### Q4. Model a B2B SaaS (orgs, teams, documents) in OpenFGA. Show the model and the calls.

**Answer:**

OpenFGA DSL (a faithful open-source Zanzibar descendant, CNCF):

```text
model
  schema 1.1

type user

type organization
  relations
    define admin: [user]
    define member: [user] or admin

type team
  relations
    define org: [organization]
    define member: [user, team#member]

type document
  relations
    define org: [organization]
    define owner: [user]
    define editor: [user, team#member] or owner or admin from org
    define viewer: [user, team#member, user:*] or editor or member from org
```

Mapping to Q2's concepts: `or editor` = `computed_userset`; `admin from org` = `tuple_to_userset` (walk the `org` tuple, take its admins); `[user, team#member]` = allowed subject types, including usersets.

```typescript
import { OpenFgaClient } from "@openfga/sdk";

const fga = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL!,
  storeId: process.env.FGA_STORE_ID!,
  authorizationModelId: process.env.FGA_MODEL_ID!, // pin the model version!
});

await fga.write({
  writes: [
    { user: "team:eng#member", relation: "viewer", object: "document:plan" },
    { user: "user:bob", relation: "member", object: "team:eng" },
  ],
});

const { allowed } = await fga.check({
  user: "user:bob", relation: "viewer", object: "document:plan",
}); // true — bob -> team:eng#member -> viewer

// For list pages: don't N+1 check; ask "which documents can bob view?"
const { objects } = await fga.listObjects({
  user: "user:bob", relation: "viewer", type: "document",
});
```

Operational guidance an FDE should volunteer: pin `authorizationModelId` per deploy (models are immutable versions); write tuples in the same unit of work as the domain change (outbox pattern if FGA is remote); use `listObjects` for list endpoints, not per-row checks.

---

### Q5. Implement a small but real policy engine in TypeScript: roles + permissions + ABAC conditions on resource attributes.

**Answer:**

Design goals: deny-by-default, explicit deny wins, permissions are `action` on `resourceType`, and each grant can carry an ABAC `condition` evaluated against subject/resource/environment attributes. This is the shape of the IAM-lite engine you'll hand-roll on an engagement when a customer can't adopt OpenFGA.

```typescript
// policy-engine.ts
type Action = "read" | "create" | "update" | "delete" | "share";
type Attrs = Record<string, string | number | boolean>;

interface Subject { id: string; tenantId: string; roles: string[]; attributes: Attrs; }
interface Resource { type: string; id: string; tenantId: string; attributes: Attrs; }
interface Environment { mfaVerified?: boolean; timeOfDayUtcHour?: number; }

interface EvalContext {
  subject: Subject;
  resource: Resource;
  action: Action;
  env: Environment;
}

type Condition = (ctx: EvalContext) => boolean;

interface Statement {
  effect: "allow" | "deny";
  actions: Action[] | "*";
  resourceTypes: string[] | "*";
  condition?: Condition;        // ABAC layer on top of RBAC grant
}

export interface Decision { allowed: boolean; reason: string; }

export class PolicyEngine {
  private byRole = new Map<string, Statement[]>();

  constructor(policies: { role: string; statements: Statement[] }[]) {
    for (const p of policies) {
      this.byRole.set(p.role, [...(this.byRole.get(p.role) ?? []), ...p.statements]);
    }
  }

  authorize(ctx: EvalContext): Decision {
    // Tenant boundary is NOT a policy question — it is an axiom.
    if (ctx.subject.tenantId !== ctx.resource.tenantId) {
      return { allowed: false, reason: "cross-tenant access denied" };
    }

    let allowMatch: string | null = null;

    for (const role of ctx.subject.roles) {
      for (const [i, st] of (this.byRole.get(role) ?? []).entries()) {
        if (!this.matches(st, ctx)) continue;
        if (st.effect === "deny") {
          return { allowed: false, reason: `deny by ${role}[${i}]` }; // deny wins
        }
        allowMatch = `allow by ${role}[${i}]`;
      }
    }

    return allowMatch
      ? { allowed: true, reason: allowMatch }
      : { allowed: false, reason: "no matching allow (default deny)" };
  }

  private matches(st: Statement, ctx: EvalContext): boolean {
    const actionOk = st.actions === "*" || st.actions.includes(ctx.action);
    const typeOk = st.resourceTypes === "*" || st.resourceTypes.includes(ctx.resource.type);
    if (!actionOk || !typeOk) return false;
    // A failed condition means the statement doesn't match (NOT a deny).
    if (st.condition) {
      try {
        return st.condition(ctx);
      } catch {
        return false; // fail closed on condition errors
      }
    }
    return true;
  }
}

export const engine = new PolicyEngine([
  {
    role: "viewer",
    statements: [{ effect: "allow", actions: ["read"], resourceTypes: ["document"] }],
  },
  {
    role: "editor",
    statements: [
      {
        effect: "allow",
        actions: ["read", "create", "update"],
        resourceTypes: ["document"],
        // ABAC: confidential documents require high clearance.
        condition: (ctx) =>
          ctx.resource.attributes["classification"] !== "confidential" ||
          ctx.subject.attributes["clearance"] === "high",
      },
    ],
  },
  {
    role: "owner-scope",
    statements: [
      {
        effect: "allow",
        actions: ["update", "delete", "share"],
        resourceTypes: ["document"],
        // ReBAC-flavored ABAC: ownership as a resource attribute.
        condition: (ctx) => ctx.resource.attributes["ownerId"] === ctx.subject.id,
      },
    ],
  },
  {
    role: "org-admin",
    statements: [
      { effect: "allow", actions: "*", resourceTypes: "*" },
      { effect: "deny", actions: ["delete"], resourceTypes: ["audit_log"] },
      {
        effect: "deny",
        actions: "*",
        resourceTypes: "*",
        // Environmental ABAC: admin actions require MFA.
        condition: (ctx) => ctx.env.mfaVerified !== true,
      },
    ],
  },
]);
```

Callers get back a `Decision`; on `allowed: false` return a bare `403` (or `404`, see Q11) — log `reason` internally for audit, never return it to the client. Points to make in an interview: **default deny**, **explicit deny overrides allow**, **fail-closed conditions**, and tenant check as a precondition, not a policy.

**Interview trap:** loading policy conditions from a database as strings and `eval()`-ing them. Conditions must be code (as above), a safe DSL (CEL, OPA/Rego), or structured JSON operators — never evaluated arbitrary strings, which is RCE-by-config.

---

### Q6. What are the multi-tenant isolation models, and how do you choose?

**Answer:**

1. **Silo (database-per-tenant):** strongest isolation, trivial per-tenant backup/restore and residency, noisy-neighbor immunity. Cost: fleet management (migrations × N), connection sprawl, poor economics below enterprise price points.
2. **Bridge (schema-per-tenant, shared database):** middle ground; Postgres `search_path` routing. Migrations still × N schemas; per-tenant `pg_dump` is easy; catalogs bloat beyond a few thousand schemas.
3. **Pool (shared tables, `tenant_id` column):** best economics and simplest ops; isolation is now *logical* and must be enforced on **every single query**. This is where RLS (Q7) and query scoping (Q11–12) become life-or-death.

Selection heuristics: regulated/enterprise tenants or contractual isolation → silo, at least for those tenants ("pool for SMB, silo for enterprise" hybrids are common). High tenant count, self-serve SaaS → pool with RLS as a safety net. Design the pool model as if a silo migration is coming: `tenant_id` on every table, no cross-tenant foreign keys.

**Production war story:** A team ran schema-per-tenant Postgres and celebrated "hard isolation" — until a migration tool bug ran `ALTER TABLE` against `public` instead of iterating schemas, and their per-tenant migration loop took 6 hours across 4,000 schemas, blowing the deploy window every release. They moved new tenants to pooled tables + RLS and kept schemas only for 12 regulated customers. Lesson: the isolation model is an *operational* commitment, not just a security one — migrations, backups, and connection counts all scale with it.

---

### Q7. Show actual Postgres Row-Level Security for a pooled multi-tenant schema.

**Answer:**

```sql
CREATE TABLE documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  owner_id   uuid NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON documents (tenant_id, created_at DESC); -- RLS predicate must be indexable!

-- 1) Enable RLS...
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- 2) ...and FORCE it, so even the table owner is subject to policies.
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- 3) The tenant policy. current_setting(..., true) returns NULL instead of
--    erroring when the variable is unset -> no rows match (fail closed).
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 4) Application role: plain permissions, NO BYPASSRLS, not the table owner.
CREATE ROLE app_user LOGIN PASSWORD '...' NOBYPASSRLS;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO app_user;
```

Key mechanics:

- `USING` filters row **visibility** (SELECT/UPDATE/DELETE targets); `WITH CHECK` validates rows being **written** (INSERT and the new version of UPDATE). Without `WITH CHECK`, a tenant could *insert* rows carrying another tenant's ID even though it can't read them back.
- `current_setting('app.tenant_id', true)` — the `true` (missing_ok) argument is critical. Without it, an unset variable throws; with it, unset → `NULL`, and `tenant_id = NULL` is never true → **zero rows, fail closed**. Never default the setting to a real tenant.
- Multiple policies of the same type are OR-ed (permissive) by default. Use `AS RESTRICTIVE` for policies that must AND with everything else:

```sql
CREATE POLICY not_deleted ON documents
  AS RESTRICTIVE
  USING (deleted_at IS NULL);   -- soft-deleted rows invisible to everyone
```

- Per-command policies exist (`FOR SELECT`, `FOR INSERT`, ...) when read and write predicates differ.

RLS is your **safety net**, not your primary control: the application still scopes queries (Q12); RLS catches the query someone forgot to scope.

---

### Q8. "We enabled RLS, so we're isolated." What are the bypass gotchas? Show vulnerable vs fixed.

**Answer:**

Three well-known bypasses:

1. **Superusers and roles with `BYPASSRLS` skip all policies.** Many teams' "app user" is actually `postgres` (default Docker compose files, some managed DBs' master user). RLS silently does nothing for them.
2. **Table owners bypass RLS by default.** `ENABLE ROW LEVEL SECURITY` alone does not apply policies to the role that owns the table. If your app connects as the role that ran migrations (extremely common), RLS is decorative. Fix: `FORCE ROW LEVEL SECURITY`, and separate the migration role from the runtime role.
3. **The variable is attacker-influenced or unset-open.** If the app ever executes `SET app.tenant_id = <value from a request header>` without deriving it from the *authenticated* session, RLS enforces the attacker's chosen tenant.

**Vulnerable setup:**

```sql
-- Migrations and the app both run as role "svc" (table owner).
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
-- svc owns documents -> policies DO NOT APPLY to svc: full table visible.
-- current_setting without missing_ok -> unset var = ERROR, which ops "fixed" with:
-- ALTER ROLE svc SET app.tenant_id = '<some-uuid>';   -- !! default tenant = breach
```

**Fixed setup:**

```sql
CREATE ROLE migrator LOGIN NOBYPASSRLS;   -- owns DDL
CREATE ROLE app_user LOGIN NOBYPASSRLS;   -- runtime DML only

ALTER TABLE documents OWNER TO migrator;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;   -- owner is covered too

CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO app_user;
-- App connects ONLY as app_user. Verify:
--   SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_user';
```

Also audit: `SECURITY DEFINER` functions run with the *definer's* privileges (owner → RLS-exempt unless FORCE), and views execute with the view owner's rights by default — use `security_invoker = true` (Postgres 15+) for tenant-scoped views.

**Interview trap:** "RLS on the primary protects reads everywhere." Logical replicas, `pg_dump` by privileged roles, CDC feeds into analytics warehouses, and `COPY` jobs typically run as privileged roles — every downstream copy of the data needs its own isolation story.

---

### Q9. Why is `SET app.tenant_id` dangerous behind a connection pooler, and what's the correct pattern?

**Answer:**

Poolers (PgBouncer in transaction mode, RDS Proxy, application-side pools) multiplex many logical clients over few physical connections. A plain `SET` (= `SET SESSION`) sticks to the **physical connection** until changed — tenant A's request runs `SET app.tenant_id='A'`, the transaction ends, the connection is handed to tenant B's request, and if B's code path fails to set the variable, **B queries with A's tenant context**. Cross-tenant exposure caused by connection reuse, no attacker required.

Correct pattern: **`SET LOCAL` inside an explicit transaction** — the setting evaporates at COMMIT/ROLLBACK, so it can never leak across pooled requests:

```sql
BEGIN;
SET LOCAL app.tenant_id = '3f8a...';   -- scoped to THIS transaction only
SELECT * FROM documents WHERE created_at > now() - interval '7 days';
COMMIT;  -- app.tenant_id reverts automatically
```

Rules:
- `SET LOCAL` outside a transaction is a silent no-op (Postgres warns; drivers often swallow it) — you *must* wrap in BEGIN/COMMIT.
- Never use `set_config('app.tenant_id', $1, false)` (session-scoped) from pooled code; use `set_config($1, $2, true)` (local) or `SET LOCAL`.
- Parameterize via `set_config` (which accepts bind parameters) rather than string-interpolating into `SET LOCAL` — `SET` cannot take bind parameters.
- PgBouncer transaction mode breaks other session state too (prepared statements, advisory locks held across transactions); `SET` is the same family of problem.

**Production war story:** A B2B analytics product added PgBouncer (transaction pooling) during a scale push. Their repository layer ran `set_config('app.tenant_id', $1, false)` once per pool *checkout* — but a hot read path used a lightweight helper that skipped checkout hygiene. Result: intermittent reports of "someone else's dashboard" that never reproduced in staging (no pooler there, single-tenant test data). The fix was mechanical — every query path forced through one `withTenantTransaction()` helper using `SET LOCAL` — plus a canary: a nightly job that set tenant A, queried a sentinel row owned by tenant B, and paged if any row came back. Second lesson: staging must run the same pooler topology as prod.

---

### Q10. Implement tenant ID propagation through a Node/TypeScript stack with AsyncLocalStorage, ending in a per-transaction Postgres session variable.

**Answer:**

The problem: tenant context is established once (JWT at the edge) but needed in every repository, without threading a `tenantId` parameter through 40 function signatures. `AsyncLocalStorage` (ALS) gives request-scoped implicit context that survives `await`.

```text
            Tenant ID propagation (one request)

  HTTP request ──► [authn middleware]     JWT verified; tenant_id CLAIM extracted
                        │                 (never from a header/body the client controls)
                        ▼
                 [tenantContext.run({tenantId}, next)]     AsyncLocalStorage
                        │  ...........................................
                        ▼  : every await in this request sees the store :
                 [service layer]           no tenantId parameter needed
                        ▼
                 [repository]  ──► BEGIN
                                   SET LOCAL app.tenant_id = '<from ALS>'
                                   SELECT ... ;      ◄── RLS filters rows
                                   COMMIT            ◄── setting evaporates
                        ▼
                 [Postgres RLS policy: tenant_id = current_setting('app.tenant_id')]
```

```typescript
// tenant-context.ts
import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  tenantId: string;
  userId: string;
}

const als = new AsyncLocalStorage<TenantContext>();

export const tenantContext = {
  run<T>(ctx: TenantContext, fn: () => T): T {
    return als.run(ctx, fn);
  },
  get(): TenantContext {
    const ctx = als.getStore();
    if (!ctx) {
      // Fail closed: background jobs must establish context explicitly.
      throw new Error("No tenant context — refusing to run unscoped query");
    }
    return ctx;
  },
};
```

```typescript
// middleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { tenantContext } from "./tenant-context";

interface AccessClaims {
  sub: string;
  tenant_id: string; // put into the token AT ISSUANCE, server-side
}

export function withTenant(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthenticated" });

  let claims: AccessClaims;
  try {
    claims = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
      algorithms: ["RS256"],
      issuer: "https://auth.example.com",
      audience: "api.example.com",
    }) as AccessClaims;
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }

  // The ONLY source of tenant is the verified token. Never req.headers["x-tenant-id"].
  tenantContext.run({ tenantId: claims.tenant_id, userId: claims.sub }, next);
}
```

```typescript
// db.ts — every tenant query flows through withTenantTransaction
import { Pool, type PoolClient } from "pg";
import { tenantContext } from "./tenant-context";

const pool = new Pool({ connectionString: process.env.DATABASE_URL }); // role: app_user

export async function withTenantTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const { tenantId } = tenantContext.get(); // throws if missing — fail closed
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // set_config(name, value, is_local=true) === SET LOCAL, but parameterizable.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release(); // setting already gone (LOCAL), safe for the next tenant
  }
}
```

Repositories then combine belt and suspenders: read `tenantId` from `tenantContext.get()` and add `AND tenant_id = $n` explicitly (see Q11's fixed handlers), even though RLS would also filter.

Gotchas to name: ALS context is lost if a library breaks async continuity (rare now, but test it); **background jobs/queues** don't pass through HTTP middleware, so the job payload must carry `tenantId` and the worker must call `tenantContext.run()` explicitly; and never cache a `PoolClient` across requests.

---

### Q11. What is IDOR/BOLA? Show vulnerable code and the fix.

**Answer:**

**IDOR** (Insecure Direct Object Reference) / **BOLA** (Broken Object Level Authorization — OWASP API Security Top 10, **API1**, ranked #1) is when an endpoint takes an object identifier and returns/mutates the object **without verifying the caller is authorized for that specific object**. Authentication passes, role checks pass — the caller just increments an ID or pastes someone else's UUID.

**Vulnerable:**

```typescript
// GET /api/invoices/:id
app.get("/api/invoices/:id", requireAuth, async (req, res) => {
  // Authenticated? yes. Authorized for THIS invoice? never checked.
  const { rows } = await pool.query(
    "SELECT * FROM invoices WHERE id = $1",
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).end();
  res.json(rows[0]); // any authenticated user reads any tenant's invoice
});

// PATCH /api/invoices/:id — write-side BOLA is worse
app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
  await pool.query(
    "UPDATE invoices SET status = $1 WHERE id = $2",
    [req.body.status, req.params.id]
  );
  res.status(204).end();
});
```

**Fixed:**

```typescript
app.get("/api/invoices/:id", requireAuth, withTenant, async (req, res) => {
  const { tenantId, userId } = tenantContext.get();
  const invoice = await withTenantTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, number, amount_cents, status, owner_id
         FROM invoices
        WHERE id = $1 AND tenant_id = $2`,   -- object-level scope in the query
      [req.params.id, tenantId]
    );
    return rows[0] ?? null;
  });

  // 404, not 403: don't confirm the object exists in another tenant.
  if (!invoice) return res.status(404).json({ error: "not found" });

  // Object-level authz WITHIN the tenant (owner or role), via the Q5 engine:
  const decision = engine.authorize({
    subject: { id: userId, tenantId, roles: req.user.roles, attributes: {} },
    resource: { type: "invoice", id: invoice.id, tenantId,
                attributes: { ownerId: invoice.owner_id } },
    action: "read",
    env: { mfaVerified: req.user.mfa === true },
  });
  if (!decision.allowed) return res.status(404).json({ error: "not found" });

  res.json(invoice);
});

app.patch("/api/invoices/:id", requireAuth, withTenant, async (req, res) => {
  const { tenantId } = tenantContext.get();
  const updated = await withTenantTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE invoices SET status = $1
        WHERE id = $2 AND tenant_id = $3`,    -- scope the WRITE too
      [req.body.status, req.params.id, tenantId]
    );
    return rowCount;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});
```

Also fix the cousin vulnerabilities in the same PATCH: allow-list updatable fields (mass assignment — a client sending `{"tenant_id": "..."}` or `{"role": "admin"}` must not win), and validate `status` transitions server-side.

**Interview trap:** "We use UUIDs, so IDs aren't guessable — no IDOR risk." Unguessable IDs are *mitigation by obscurity*: IDs leak constantly (logs, URLs, exports, support tickets, related API responses). BOLA is fixed by an authorization check, never by identifier entropy.

---

### Q12. Why is "scope every query by tenant/owner" mandatory rather than a per-endpoint judgment call? What's the defense-in-depth stack?

**Answer:**

Because authorization bugs are **omission bugs**. XSS or SQL injection requires writing bad code; BOLA requires *not writing* one clause — and nothing fails. The unscoped query returns plausible data, tests with single-tenant fixtures pass, and the endpoint ships. Across hundreds of endpoints and years of contributors, the probability that every handler remembers its `AND tenant_id = $n` is effectively zero. So the control must be **structural**, not disciplinary:

1. **Make the safe path the only path.** Repositories accept no raw client; every query flows through `withTenantTransaction` (Q10), which *cannot run* without tenant context (fail-closed throw).
2. **RLS as the backstop** (Q7–Q9): the query someone inevitably forgets to scope returns zero foreign rows instead of a breach.
3. **Object-level checks** for intra-tenant authorization (owner/role/relationship — Q5 engine or OpenFGA Q4). Tenant scoping alone doesn't stop user A reading user B's data *inside* the same tenant.
4. **Return 404 for unauthorized objects** to avoid existence oracles.
5. **Lint/CI enforcement:** ban `pool.query` outside the db module (ESLint `no-restricted-imports`/custom rule); a CI suite that seeds two tenants and asserts every `/:id` endpoint returns 404 cross-tenant (Q19).
6. **Detection:** log authorization denials with subject/object; alert on spikes (enumeration looks like a scan of sequential 404s).

The framing that lands with interviewers: *tenant isolation is an invariant, so it belongs in infrastructure (types, wrappers, database policies), not in per-endpoint code-review vigilance.*

---

### Q13. How should API keys be stored and structured? Why SHA-256 and not bcrypt?

**Answer:**

**Never store plaintext** (or reversible encryption) — a database read (SQLi, backup leak, insider) must not yield working credentials. But unlike passwords, API keys you generate yourself are **high-entropy random strings** (256 bits from a CSPRNG). Slow hashes (bcrypt/argon2) exist to make *brute-forcing low-entropy human passwords* expensive; a 256-bit random key cannot be brute-forced regardless of hash speed, so bcrypt buys nothing — and costs a lot:

- bcrypt at cost 12 ≈ 100–300 ms per verification. API keys are verified on **every request**; at even 1k rps that's your entire CPU budget burned on hashing, plus a trivial DoS vector (attackers spam bogus keys, you burn 250 ms each).
- SHA-256 is ~1 µs, and because the input is high-entropy, the digest is still one-way in practice (no feasible preimage or dictionary attack).

**Key format — prefix for identification:**

```text
sk_live_9f2a...            (Stripe-style)
│  │    └─ 32+ bytes of CSPRNG randomness (base62/base64url)
│  └─ environment: live/test  → prevents "test key against prod" accidents
└─ type: sk=secret key, pk=publishable, rk=restricted
```

Benefits of prefixes: instantly identifiable in logs and code (GitHub secret scanning depends on recognizable patterns), environment mixups fail fast, and support can triage key type without seeing the secret. Store a short **lookup prefix** in a plain column for display/triage — and index the SHA-256 digest itself for lookup: it's deterministic, so it is directly queryable (another practical advantage over salted bcrypt, which can't be looked up by hash and would force an O(n) scan).

Lifecycle requirements: show the full key **once** at creation; **scopes** (least privilege per key); **expiry** and **rotation with overlap** (two active keys during cutover, then revoke); **last_used_at** tracking (find dead keys, detect use of a supposedly revoked one); immediate revocation.

---

### Q14. Implement API key issuance and verification in TypeScript (hashing, prefix lookup, scopes, rotation, last-used).

**Answer:**

```sql
CREATE TABLE api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  name          text NOT NULL,                -- human label: "CI deploy key"
  key_prefix    text NOT NULL,                -- "sk_live_9f2ab3c1" (identification only)
  key_hash      bytea NOT NULL UNIQUE,        -- SHA-256 digest of the full key
  scopes        text[] NOT NULL DEFAULT '{}',
  expires_at    timestamptz,
  revoked_at    timestamptz,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON api_keys (tenant_id);
```

```typescript
// api-keys.ts
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ENV_TAG = process.env.NODE_ENV === "production" ? "live" : "test";

function sha256(input: string): Buffer {
  return createHash("sha256").update(input, "utf8").digest();
}

export interface IssuedKey {
  id: string;
  plaintextKey: string; // shown ONCE, never persisted
  prefix: string;
}

export async function issueApiKey(opts: {
  tenantId: string;
  name: string;
  scopes: string[];
  ttlDays?: number;
}): Promise<IssuedKey> {
  const secret = randomBytes(32).toString("base64url"); // 256 bits entropy
  const key = `sk_${ENV_TAG}_${secret}`;
  const prefix = key.slice(0, 16); // "sk_live_" + 8 chars — safe to log/display

  const expiresAt = opts.ttlDays
    ? new Date(Date.now() + opts.ttlDays * 86_400_000)
    : null;

  const { rows } = await pool.query(
    `INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [opts.tenantId, opts.name, prefix, sha256(key), opts.scopes, expiresAt]
  );
  return { id: rows[0].id, plaintextKey: key, prefix };
}

export interface VerifiedKey {
  keyId: string;
  tenantId: string;
  scopes: string[];
}

export async function verifyApiKey(presented: string): Promise<VerifiedKey | null> {
  if (!/^sk_(live|test)_[A-Za-z0-9_-]{40,50}$/.test(presented)) return null;
  if (!presented.startsWith(`sk_${ENV_TAG}_`)) return null; // env mixup: fail fast

  const digest = sha256(presented);
  const { rows } = await pool.query(
    `SELECT id, tenant_id, scopes, key_hash, expires_at, revoked_at
       FROM api_keys
      WHERE key_hash = $1`,      -- deterministic hash => direct indexed lookup
    [digest]
  );
  const row = rows[0];
  if (!row) return null;
  // Constant-time compare (defense in depth; the DB match already proves equality).
  if (!timingSafeEqual(digest, row.key_hash)) return null;
  if (row.revoked_at) return null;
  if (row.expires_at && row.expires_at < new Date()) return null;

  // last_used_at: fire-and-forget, coarse (avoid a hot UPDATE per request).
  void pool.query(
    `UPDATE api_keys SET last_used_at = now()
      WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < now() - interval '5 minutes')`,
    [row.id]
  ).catch(() => { /* metrics, not correctness */ });

  return { keyId: row.id, tenantId: row.tenant_id, scopes: row.scopes };
}

export function requireScope(verified: VerifiedKey, scope: string): void {
  if (!verified.scopes.includes(scope)) {
    const err = new Error(`missing scope: ${scope}`) as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

// Rotation with overlap: issue replacement, grace-period the old key.
export async function rotateApiKey(oldKeyId: string, graceHours = 24): Promise<IssuedKey> {
  const { rows } = await pool.query(
    `SELECT tenant_id, name, scopes FROM api_keys WHERE id = $1 AND revoked_at IS NULL`,
    [oldKeyId]
  );
  if (!rows[0]) throw new Error("key not found or already revoked");

  const replacement = await issueApiKey({
    tenantId: rows[0].tenant_id,
    name: `${rows[0].name} (rotated ${new Date().toISOString().slice(0, 10)})`,
    scopes: rows[0].scopes,
  });
  await pool.query(
    `UPDATE api_keys SET expires_at = now() + ($2 || ' hours')::interval WHERE id = $1`,
    [oldKeyId, String(graceHours)]
  );
  return replacement;
}
```

Middleware wiring: the verified key's `tenantId` feeds the same ALS context as JWT auth (Q10), so keys and user sessions share one enforcement path. Rate-limit *failed* verifications per IP to blunt enumeration.

**Interview trap:** "HMAC the key with a server secret instead of plain SHA-256?" That (a *pepper*) is a legitimate upgrade — a leaked DB alone can't verify candidate keys — but be ready to say what it costs: verification now depends on a KMS/secret, and losing the pepper invalidates every key. Plain SHA-256 of a 256-bit random key is the accepted industry baseline; peppering is defense-in-depth, bcrypt is the wrong tool entirely.

---

### Q15. How does mTLS provide service-to-service authorization, and what are its operational realities?

**Answer:**

In mutual TLS both sides present certificates: the client proves its identity to the server, not just vice versa. The server extracts the client's identity from the verified cert (SAN / SPIFFE URI) and applies authz policy ("only `checkout` may call `payments:charge`"). Properties: identity is bound to the *connection* and rooted in a CA you control; credentials are asymmetric keys (nothing bearer-shaped to replay from a leaked request log); encryption comes for free.

```typescript
import https from "node:https";
import fs from "node:fs";

const server = https.createServer(
  {
    key: fs.readFileSync("/etc/tls/server.key"),
    cert: fs.readFileSync("/etc/tls/server.crt"),
    ca: fs.readFileSync("/etc/tls/internal-ca.crt"), // ONLY our internal CA
    requestCert: true,
    rejectUnauthorized: true,                        // no cert / bad cert => TLS failure
  },
  (req, res) => {
    const socket = req.socket as import("tls").TLSSocket;
    const cert = socket.getPeerCertificate();
    const spiffeId = cert.subjectaltname; // "URI:spiffe://prod.example.com/ns/shop/sa/checkout"

    // AuthN (valid cert from our CA) done; now AuthZ on the identity:
    if (spiffeId !== "URI:spiffe://prod.example.com/ns/shop/sa/checkout") {
      res.writeHead(403).end("forbidden");
      return;
    }
    res.writeHead(200).end("ok");
  }
);
server.listen(8443);
```

Operational realities to volunteer: certificate **rotation** is the whole game — short-lived certs (hours) demand automation, which is exactly what SPIRE/service meshes provide (Q16); **revocation** (CRL/OCSP) is painful, another argument for short lifetimes; mTLS authenticates the *workload*, not the *end user* — you still propagate user identity (JWT) inside the mTLS channel; and TLS-terminating load balancers between services silently break mTLS unless they pass through or re-originate it.

**Interview trap:** "The service mesh gives us mTLS, so services are authorized." Mesh mTLS out of the box often means *any* workload in the mesh can call *any other* — authentication without authorization. You must still write per-route policy (e.g., Istio `AuthorizationPolicy` keyed on source principal).

---

### Q16. Explain SPIFFE and SPIRE: SVIDs, trust domains, and workload attestation.

**Answer:**

**SPIFFE** (Secure Production Identity Framework For Everyone) is a specification for workload identity; **SPIRE** is its production reference implementation (both CNCF graduated). The problem they solve is the *bottom turtle*: every auth scheme needs a credential, but how does a fresh workload get its **first** credential without a human seeding a secret ("secret zero")?

Core concepts:

- **SPIFFE ID:** a URI naming a workload — `spiffe://prod.example.com/ns/shop/sa/checkout`. The host part is the **trust domain** (an independent root of trust, typically per environment or org); the path identifies the workload.
- **SVID (SPIFFE Verifiable Identity Document):** the credential carrying that ID — either an **X.509-SVID** (cert with the SPIFFE ID in a URI SAN; used directly for mTLS) or a **JWT-SVID** (for hops where TLS identity can't traverse, e.g., an L7 proxy). Short-lived (~1 hour default), auto-rotated.
- **Trust bundle:** the trust domain's CA material, distributed to workloads so they can *verify* peer SVIDs. **Federation** exchanges bundles between trust domains so `prod.example.com` workloads can authenticate `partner.example.org` workloads.

SPIRE architecture: a **server** (holds the CA, signs SVIDs, stores registration entries) and per-host **agents**:

1. **Node attestation:** the agent proves what node it runs on using platform evidence (AWS instance identity document, GCP/Azure equivalents, Kubernetes PSAT) — no pre-shared secret.
2. **Workload attestation:** a workload connects to the agent's local **Workload API** (Unix socket). The agent inspects the calling process out-of-band (k8s: pod service account/namespace/labels; Linux: UID, binary path, cgroup) and matches selectors to registration entries → SPIFFE ID.
3. The agent hands the workload its SVID + trust bundle and keeps rotating them. The workload never touched a bootstrap secret.

Why an FDE cares: this is the machinery under Istio/Linkerd identity, and it's the right answer to "how do services authenticate without hardcoded credentials across our EKS cluster and on-prem VMs?" — SPIFFE IDs are platform-neutral, and short-lived auto-rotated SVIDs replace both long-lived API keys and manual cert renewal for east-west traffic.

---

### Q17. Where in the stack should authorization be enforced — API gateway, service, or database?

**Answer:**

All three, with different responsibilities — the senior answer is *layered placement*, not a single point:

- **Gateway/edge:** coarse checks only — authentication, token validity, tenant-level routing, rate limits, scope-to-route mapping (`invoices:read` required for `/invoices/*`). The gateway lacks object context, so it *cannot* fix BOLA. Danger: teams see "authz at the gateway" on an architecture slide and skip service-level checks.
- **Service layer:** the primary decision point — it has the subject, the object (loaded with its attributes/relationships), and the action. This is where the policy engine (Q5) or FGA check (Q4) runs. Keep decision logic centralized (one engine/PDP) even though enforcement is per-endpoint, or you'll get 40 hand-rolled variants.
- **Database:** invariants, not decisions — RLS for tenant isolation (Q7), constraints for integrity. The DB can't cleanly express "owner or shared-with-team," but it's the last line that holds when application code has a bug.

Two cross-cutting rules: **decisions close to the data they need** (checking object ownership at the gateway means the gateway querying the object — you've moved the data problem, not solved it), and **monitor divergence between layers** (a request that RLS filtered to zero rows *after* app-layer scoping passed is a bug worth paging on).

**Interview trap:** "We centralized authz in a middleware that runs before the handler." Middleware runs *before the object is loaded*, so it can only do type/route-level checks — object-level authorization inherently happens after fetch (or inside the query). If a design does all authz pre-handler, probe it on BOLA and watch it collapse.

---

### Q18. A request arrives at `acme.yourapp.com` with a valid JWT. What determines the tenant, and what goes wrong if you choose badly?

**Answer:**

The tenant must come from a **server-verified binding to the authenticated principal** — in practice, a `tenant_id`/`org_id` claim placed in the token *at issuance*, after the auth server checked membership. Everything else on the request is attacker-controlled input:

- **Subdomain/`Host` header:** routing hint only. If code does `tenantId = req.hostname.split(".")[0]`, any user points their valid token at `victimcorp.yourapp.com` and reads victimcorp's data. Correct behavior: resolve the subdomain's tenant, then **verify it equals the token's tenant claim**, else 403.
- **`X-Tenant-Id` header / body field / query param:** never. This is BOLA at the tenant level.
- **Multi-org users:** the token should be scoped to *one* active org (re-issue on org switch, like GitHub/Slack), or carry the org list with the API verifying the *requested* org is in it. Switching orgs by client-side assertion alone is the vulnerability.

```typescript
// Vulnerable
const tenantId = (req.headers["x-tenant-id"] as string) ?? req.hostname.split(".")[0];

// Fixed
const claims = verifyJwt(token);                                  // signature, iss, aud, exp
const hostTenant = await resolveTenantBySubdomain(req.hostname);  // lookup, not trust
if (!hostTenant || hostTenant.id !== claims.tenant_id) {
  return res.status(403).json({ error: "tenant mismatch" });
}
tenantContext.run({ tenantId: claims.tenant_id, userId: claims.sub }, next);
```

**Production war story:** During a proof-of-value, a customer's pen-test team found that our partner-integration endpoint accepted `X-Org-Id` "temporarily, for the demo" — added weeks earlier to unblock a mobile build that couldn't get org claims into its tokens. It shipped to staging with real seeded customer data, and the pen testers pivoted across every seeded org in an afternoon. The finding nearly killed the deal; the remediation (claims-based tenant + the ALS pipeline from Q10 + an RLS backstop) became the reference architecture we then *sold* as a differentiator. Lessons: "temporary" auth shortcuts outlive their excuse, and for an FDE, isolation architecture is a sales asset — bring the diagram to the security review before they ask.

---

### Q19. How do you *test* tenant isolation and object-level authorization so regressions can't ship?

**Answer:**

Treat isolation as an invariant with automated adversarial coverage:

1. **Two-tenant fixture as a first-class harness.** Seed tenants A and B with parallel data. For every route, run the confused-deputy matrix: A's token against B's object IDs must yield 404 (never 200, never a leaky 403 with object details).

```typescript
// isolation.spec.ts (supertest + a route manifest)
import request from "supertest";
import { app } from "../src/app";
import { seedTwoTenants } from "./fixtures";

describe("cross-tenant isolation", () => {
  it("denies every object route across tenants", async () => {
    const { tokenA, objectsB } = await seedTwoTenants();
    const routes = [
      (id: string) => ({ method: "get" as const, path: `/api/invoices/${id}` }),
      (id: string) => ({ method: "patch" as const, path: `/api/invoices/${id}` }),
      (id: string) => ({ method: "delete" as const, path: `/api/documents/${id}` }),
    ];
    for (const build of routes) {
      for (const objectId of objectsB) {
        const { method, path } = build(objectId);
        const res = await request(app)[method](path)
          .set("Authorization", `Bearer ${tokenA}`)
          .send({ status: "paid" });
        expect([401, 404]).toContain(res.status); // never 200/204
      }
    }
  });
});
```

2. **RLS tests at the SQL layer**, independent of the app: connect as `app_user`, `SET LOCAL app.tenant_id` to A, assert B's sentinel row is invisible *and* uninsertable (`WITH CHECK` coverage); also assert queries with **no** tenant setting return zero rows (fail-closed).
3. **Route-coverage gate:** generate the route list from the router at test time and fail CI if a mutating or `/:id` route has no isolation test — the dangerous route is the one added last week.
4. **Static enforcement:** ESLint rule banning `pool.query` outside `db.ts`; the code-review checklist item gets retired in favor of the lint.
5. **Runtime canaries in prod:** a synthetic tenant pair with a scheduled probe attempting cross-tenant reads, paging on any 200; monitor for 404-burst enumeration patterns.
6. **Authorization-decision audit log** (subject, object, action, decision, policy reason) — required for forensics and for answering enterprise "prove isolation" questionnaires.

---

## Quick-reference: the isolation checklist an FDE brings to a security review

```text
[ ] Tenant source of truth = verified token claim (never host/header/body)
[ ] ALS (or equivalent) context; queries fail closed without it
[ ] Every tenant table: tenant_id NOT NULL + composite indexes led by tenant_id
[ ] RLS: ENABLE + FORCE, USING + WITH CHECK, current_setting(..., true)
[ ] App role: NOBYPASSRLS, not superuser, not table owner; migrator separate
[ ] Pooler-safe: SET LOCAL / set_config(..., true) inside explicit transactions
[ ] Object-level authz after load (or in the query); 404 for foreign objects
[ ] API keys: sk_<env>_ prefix, SHA-256 digest stored, scopes, expiry,
    rotation-with-overlap, last_used_at
[ ] Service-to-service: mTLS with per-route authz on SPIFFE identity;
    short-lived SVIDs via SPIRE/mesh; user identity still propagated in-band
[ ] Two-tenant adversarial tests in CI + prod canary tenant pair
[ ] Authorization decision audit log
```

All patterns in this file are presented defensively: the "vulnerable" snippets exist so you can recognize and remediate them in code review and pen-test findings — and articulate exactly why the fixed versions hold.
