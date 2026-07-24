# Cloud & Kubernetes Security - Senior Interview Deep Dive

An FDE deploys into the customer's cloud account and cluster, so you must reason about IAM policy evaluation, instance-metadata SSRF, KMS/secret rotation, VPC isolation, and Kubernetes RBAC/pod-security the way the customer's platform team does — often *better*, because you're the one asking for least-privilege roles they'd rather hand-wave. This file is AWS + Kubernetes because that's the modal customer. Every answer pairs the concept with a vulnerable→fixed Terraform or YAML snippet you can actually apply. Framing is defensive: we understand attacker paths (SSRF→IMDS→creds, over-broad roles, base64 "secrets") to design them out.

---

### Q1. Walk me through AWS IAM policy evaluation logic. If a user has an allow and something else has a deny, what wins?

**Answer:**

IAM evaluation is deterministic and **deny-by-default**. For a given request (principal + action + resource + conditions), AWS collects *all* applicable policies and evaluates in this order:

1. **Explicit deny** anywhere → **DENY**, full stop. Nothing overrides an explicit deny.
2. **SCP (Service Control Policy)** — if Organizations SCPs don't *allow* the action, it's denied (SCPs set the max permission boundary for the account; they never *grant*).
3. **Resource-based policy** — an explicit allow here can grant access (and enables cross-account without a role, and can allow even if the identity policy is silent, for same-account it's OR'd with identity policy).
4. **Permission boundary** — if set on the principal, the action must be allowed by the boundary *and* the identity policy.
5. **Session policy** — if present (assumed-role/federation), further narrows.
6. **Identity-based policy** — must allow.
7. If no explicit allow anywhere applies → **implicit DENY**.

The mental model: the request must be **allowed by every applicable "must-allow" gate (SCP ∧ boundary ∧ session ∧ (identity ∨ resource)) and denied by none.** An explicit deny short-circuits everything.

```
             ┌─ explicit DENY anywhere? ──── yes ──▶ DENY
request ────▶│
             └─ no ──▶ SCP allows? ─no─▶ DENY
                        │ yes
                        ▼
                   boundary allows (if set)? ─no─▶ DENY
                        │ yes
                        ▼
                   session allows (if set)? ─no─▶ DENY
                        │ yes
                        ▼
                   identity OR resource allows? ─no─▶ DENY (implicit)
                        │ yes
                        ▼
                       ALLOW
```

**Interview trap:** "an allow and a deny — the more specific wins." Wrong; there's no specificity contest. **Explicit deny always wins**, regardless of specificity or where it lives. Also: SCPs and permission boundaries *never grant* permissions — they only cap them.

---

### Q2. Explain `sts:AssumeRole` and why role assumption is preferred over long-lived IAM user keys.

**Answer:**

`AssumeRole` exchanges an existing identity for **temporary credentials** (access key + secret + session token) for a *role*, valid 15 min–12 h. Two policies must align:

- The role's **trust policy** (a resource-based policy on the role) says *who may assume it* — the `Principal`.
- The caller's **identity policy** must grant `sts:AssumeRole` on that role ARN.

Both sides must agree — this is the two-key handshake that makes cross-account safe.

Why roles over IAM user access keys:
- **Short-lived** — credentials expire; a leaked session token is useless in hours vs. a static key that's valid until someone notices and rotates it (often never — the classic "key in a git repo from 2019").
- **No secret to store/rotate** — the workload gets creds from the metadata service / OIDC exchange; there's nothing to leak into an env var or `.env`.
- **Auditable & scoped** — `AssumeRole` calls are in CloudTrail; you can add `ExternalId`, session tags, session policies, MFA conditions.

```hcl
# Role trust policy: only this specific role in account 111... may assume it, with an ExternalId.
data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::111122223333:role/deployer"]
    }
    condition {                              # confused-deputy protection, see Q4
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = ["customer-acme-unique-id"]
    }
  }
}
```

**Production war story:** a customer's CI used a static IAM user key with `AdministratorAccess`, committed in a Jenkins config. We replaced it with OIDC federation (GitHub Actions → `AssumeRoleWithWebIdentity` → a scoped deploy role) so there were *zero* long-lived keys. The migration also cut the blast radius: the CI role could deploy but not read customer data.

---

### Q3. What are permission boundaries and SCPs, and how do they differ? Give a scenario for each.

**Answer:**

Both *cap* permissions (they never grant), but at different scopes and owned by different people:

| | SCP (Service Control Policy) | Permission boundary |
|---|---|---|
| Scope | An **account** (or OU) in an Organization | A **single IAM principal** (user/role) |
| Set by | Org/central security team | Account admin (often delegated) |
| Purpose | Guardrail across whole accounts | Cap what a *delegated admin* can grant |
| Affects | All principals in the account (incl. root, mostly) | Only the principal it's attached to |
| Grants? | No — max boundary only | No — max boundary only |

**SCP scenario:** "No account in the `Prod` OU may disable CloudTrail, delete config recorders, or use regions outside us-east-1/eu-west-1." A single deny SCP enforces this across every principal in every prod account, even future ones.

**Permission boundary scenario — safe delegation:** you let application teams create their own roles (self-service), but you don't want them minting `AdministratorAccess`. You require every role they create to have a permission boundary attached, and their own role is only allowed to `iam:CreateRole`/`AttachRolePolicy` *if* the boundary is present. Now a team can grant their app at most what the boundary allows — they can't privilege-escalate.

```hcl
# The boundary that delegated admins MUST attach to any role they create.
resource "aws_iam_policy" "app_boundary" {
  name   = "app-permission-boundary"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:PutObject", "dynamodb:*", "logs:*"]
      Resource = "*"
    }, {
      Effect = "Deny"                       # never let a delegated role touch IAM/org
      Action = ["iam:*", "organizations:*", "account:*"]
      Resource = "*"
    }]
  })
}
```

**Interview trap:** "SCPs grant permissions to an account." No — an SCP is a *filter*; you still need identity policies to actually grant. An empty/`FullAWSAccess` SCP allows everything to pass through to be granted; a restrictive SCP subtracts.

---

### Q4. Explain the confused-deputy problem in cross-account IAM and how `ExternalId` fixes it.

**Answer:**

You're a SaaS vendor. To manage a customer's account, they create a role trusting *your* account's principal. The confused-deputy attack: your role ARN is not secret. Attacker Mallory is *also* your customer; she configures *her* account's role to trust you, then discovers/guesses **Victor's** role ARN and — if your service will assume any role a customer names — tricks your service into assuming Victor's role and acting in his account. Your service is the confused deputy: it has the authority (customers trust it) and Mallory supplies the intent.

**Fix: `ExternalId`.** When a customer onboards, you issue them a unique, unguessable `ExternalId` and require it in the role's trust policy condition. Your service always passes *the ExternalId it has on file for that customer*. Mallory can't make your service assume Victor's role because she doesn't know Victor's ExternalId, and your service would pass *her* ExternalId (which Victor's trust policy rejects).

```hcl
# Customer's role trust policy — REQUIRES the ExternalId you assigned them.
statement {
  actions = ["sts:AssumeRole"]
  principals {
    type        = "AWS"
    identifiers = ["arn:aws:iam::VENDOR_ACCT:role/saas-connector"]
  }
  condition {
    test     = "StringEquals"
    variable = "sts:ExternalId"
    values   = ["acme-7f3c9a12-do-not-share"]   # unique per customer, unguessable
  }
}
```

Rules: the ExternalId must be **unique per customer** and **assigned by the vendor** (not chosen by the customer, or a customer could reuse a value). It's not a secret in the cryptographic sense — it's an anti-confused-deputy nonce.

**Interview trap:** thinking ExternalId is authentication. It isn't a password; it's specifically to stop the cross-customer confused-deputy. The actual authn is the account-principal trust; ExternalId disambiguates *on whose behalf*.

---

### Q5. IMDSv1 vs IMDSv2 — what's the SSRF risk and how does v2 fix it?

**Answer:**

The **Instance Metadata Service** at `169.254.169.254` serves an EC2 instance its own metadata — including, if an instance profile is attached, **temporary IAM credentials** at `/latest/meta-data/iam/security-credentials/<role>`. This is the crown-jewel target of cloud SSRF.

**IMDSv1** is a simple request/response: any process on the box (or anything that can make the box send a request there) `GET`s the URL and gets creds. That means a **server-side request forgery** bug in your app — "fetch this URL for me" — can be pointed at IMDS and exfiltrate the node's role credentials. This is exactly how the 2019 Capital One breach worked: SSRF → IMDSv1 → role creds → S3 read of 100M+ records.

**IMDSv2** makes it **session-oriented** with a defense specifically against SSRF:
1. You must first `PUT` to `/latest/api/token` (with header `X-aws-ec2-metadata-token-ttl-seconds`) to get a token.
2. Then `GET` metadata with header `X-aws-ec2-metadata-token: <token>`.

Why this defeats SSRF: most SSRF primitives can only make **GET** requests and can't set arbitrary request headers, so they can't do the `PUT`+header token dance. Additionally IMDSv2 sets a low default **hop limit (1)** on the response TTL, so the credentials can't be proxied out through another hop (e.g., a container reverse-proxy).

Enforce v2 (reject v1) and, for containers, set hop limit so pods can't reach it:

```hcl
resource "aws_instance" "app" {
  # ...
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"   # IMDSv2 ONLY — reject v1
    http_put_response_hop_limit = 1            # creds can't be proxied out
  }
}
```

Even better on EKS: use **IRSA** (Q11) so pods get their own scoped creds via OIDC and never need the node's IMDS credentials at all — then you can block pod access to IMDS entirely.

**Interview trap:** "IMDSv2 encrypts the metadata" — no, it's still plaintext over the link-local address; the defense is the **PUT-token + header** requirement that ordinary SSRF can't satisfy, plus the hop limit. Also: enabling v2 isn't enough; you must set `http_tokens = required` to actually *reject* v1, otherwise both work and attackers use v1.

---

### Q6. KMS and envelope encryption — how does it work, and how do you rotate keys?

**Answer:**

**Envelope encryption** solves "how do I encrypt gigabytes without shipping them to KMS": you encrypt data with a **data key** (DEK) locally, and encrypt the DEK with a KMS **customer master key** (CMK/KMS key). You store the *encrypted* DEK next to the ciphertext. To decrypt: ask KMS to decrypt the DEK (a tiny call), then use the plaintext DEK locally.

```
GenerateDataKey → { Plaintext DEK, Encrypted DEK (wrapped by CMK) }
   encrypt data with Plaintext DEK (AES-256-GCM), then discard Plaintext DEK
   store: [ ciphertext | Encrypted DEK | nonce ]
Decrypt path: KMS.Decrypt(Encrypted DEK) → Plaintext DEK → decrypt ciphertext
```

Benefits: the CMK never leaves KMS/HSM; you make one small KMS call per object (or cache the DEK); access is gated by the CMK's **key policy** + IAM and every use is in CloudTrail.

**Rotation** has two layers:
- **KMS-managed CMK rotation** — enable `enable_key_rotation`; AWS rotates the *backing key material* annually (or a custom period). Old material is retained so old ciphertext still decrypts; you don't re-encrypt anything. This rotates the *key-encryption key*.
- **DEK rotation** — new data gets a fresh DEK each time you call `GenerateDataKey`; that's automatic per-object. To rotate DEKs on *existing* data you re-wrap or re-encrypt.

```hcl
resource "aws_kms_key" "docs" {
  description             = "envelope key for customer documents"
  enable_key_rotation     = true            # annual backing-key rotation
  rotation_period_in_days = 90              # tighten if required
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.kms_key_policy.json
}
```

The **key policy** is the important control — a KMS key's own resource policy must allow the principal; a common failure is granting `kms:*` to the whole account root, which makes the key policy a no-op and IAM alone governs. Scope it: only the app role may `Encrypt/Decrypt/GenerateDataKey`, only admins may `PutKeyPolicy/ScheduleKeyDeletion`, and separate those duties.

**Interview trap:** "rotating the CMK re-encrypts my data." No — CMK rotation swaps backing material transparently; existing ciphertext is unchanged and still decrypts via retained old material. If you need the *data* re-encrypted (e.g., a DEK was exposed) that's a separate re-encrypt job.

---

### Q7. Secrets Manager rotation — how does automatic rotation work and where does it go wrong?

**Answer:**

Secrets Manager rotation runs a **Lambda** on a schedule (e.g., every 30 days) that implements a four-step state machine using **staging labels** (`AWSCURRENT`, `AWSPENDING`, `AWSPREVIOUS`):

1. **createSecret** — generate a new secret value, store it as `AWSPENDING`.
2. **setSecret** — set the new value in the *service* (e.g., create the new DB password on the database).
3. **testSecret** — verify the new value actually works (connect with it).
4. **finishSecret** — move `AWSCURRENT` to the new version (old becomes `AWSPREVIOUS`).

The staging-label design is what enables **zero-downtime rotation**: for databases, the recommended pattern uses **two alternating users** — while user A is `AWSCURRENT` and serving traffic, rotation updates and tests user B, then flips the label. Clients that fetch on each connection pick up the new one; in-flight connections on the old value still work because `AWSPREVIOUS` remains valid for a window.

Where it goes wrong:
- **Apps cache the secret at boot** and never re-fetch → after rotation they hold a dead password and error until restart. *Fix:* fetch-on-use with a short cache TTL, or catch auth-failures and refresh.
- **Single-user rotation with a hard cutover** → a window where old connections break. *Fix:* alternating-users strategy.
- **The rotation Lambda lacks network access** to the DB (wrong VPC/SG) → rotation silently fails and you're now on a stale schedule. *Fix:* Lambda in the DB's VPC with an SG rule; alarm on `RotationFailed`.
- **No monitoring** → rotation fails for months and nobody knows until an incident. *Fix:* CloudWatch alarm on rotation failure + `LastRotatedDate` drift.

```hcl
resource "aws_secretsmanager_secret" "db" {
  name                = "prod/app/db"
  kms_key_id          = aws_kms_key.docs.arn      # encrypt the secret with your CMK
  recovery_window_in_days = 7
}
resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotate.arn
  rotation_rules { automatically_after_days = 30 }
}
```

**Production war story:** a customer enabled 30-day rotation, felt secure, and 40 days later had a partial outage — their app read the DB password once at startup into a module-level constant. Rotation flipped the label, old password was retired after the `AWSPREVIOUS` window, and pods that hadn't restarted in 40 days died. Fix was a 10-line change to fetch-on-connect with a 5-minute cache. The lesson: rotation is a *client* problem as much as an infra one.

---

### Q8. VPC isolation — security groups vs NACLs. When do you use each, and what's the classic mistake?

**Answer:**

| | Security Group | Network ACL (NACL) |
|---|---|---|
| Attaches to | ENI / instance | Subnet |
| State | **Stateful** — return traffic auto-allowed | **Stateless** — must allow both directions explicitly |
| Rules | Allow only | Allow **and** Deny |
| Evaluation | All rules, allow if any match | Numbered, first match wins |
| Default | Deny inbound, allow outbound | Default NACL allows all; custom denies all until you add rules |

**When:** security groups are your primary control — instance/pod-level, stateful, easy. NACLs are a coarse subnet-level backstop, mainly useful for *deny* rules SGs can't express (SGs have no deny), e.g., blocking a known-bad CIDR at the subnet edge, or isolating a subnet tier.

**Classic mistakes:**
- **`0.0.0.0/0` on port 22 / 3389 / the DB port.** SSH/RDP or a database open to the internet. Databases should only accept from the app tier's SG (reference the SG, not a CIDR — Q's below).
- **Forgetting NACLs are stateless.** You allow inbound 443 but forget the outbound ephemeral-port range (1024–65535) for responses → connections hang. SGs don't have this problem (stateful), which is another reason to lean on SGs.
- **Over-broad egress.** Default SG allows all outbound; that's the exfiltration path and the SSRF-to-internet path. Lock egress to what's needed (Q10).

**Fixed pattern — reference SGs, not CIDRs, so the DB only trusts the app tier:**

```hcl
resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]   # only the app SG, not a CIDR
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = [] }  # no egress needed
}
```

**Interview trap:** "NACLs are stateful like SGs." No — NACLs are **stateless**; you must allow return/ephemeral traffic explicitly. Getting this wrong causes mysterious one-way-connectivity bugs.

---

### Q9. What is PrivateLink / VPC endpoints, and why does it matter for a customer deployment?

**Answer:**

By default, calls from your VPC to AWS services (S3, KMS, Secrets Manager) or to a SaaS vendor go over the **public internet** (or via a NAT gateway to a public endpoint). **VPC endpoints** keep that traffic on the AWS private network:

- **Gateway endpoints** (S3, DynamoDB only) — a route-table entry; free; traffic to S3 stays in-region on AWS's backbone.
- **Interface endpoints / PrivateLink** — an ENI with a private IP in your subnet that fronts the service (or a partner's service). Your instances reach `secretsmanager.<region>.amazonaws.com` via a private IP; no internet, no NAT.

Why it matters for FDE deployments:
- **Data-egress compliance.** Many enterprise customers require that data never traverses the public internet. Interface endpoints let your app reach KMS/Secrets Manager/S3 privately — a checkbox their security team demands.
- **Blast-radius reduction.** With endpoints you can run private subnets with **no internet gateway / no NAT at all**, so a compromised instance can't exfiltrate to the internet — its only egress is the specific AWS services you've fronted.
- **Endpoint policies** add another authz layer — you can restrict an S3 endpoint to only your buckets, blocking exfil to attacker-owned buckets even if creds leak.

```hcl
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnets
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true
  policy = jsonencode({                       # endpoint policy: only your role
    Statement = [{ Effect = "Allow", Principal = "*",
      Action = "secretsmanager:GetSecretValue",
      Resource = "arn:aws:secretsmanager:${var.region}:${var.account}:secret:prod/app/*" }]
  })
}
```

**Production war story:** a healthcare customer's requirement was "no PHI-adjacent traffic touches the public internet." We ran the app in private subnets with **zero NAT gateways**, reaching S3 (gateway endpoint), KMS + Secrets Manager (interface endpoints), and their on-prem via a Direct Connect. The absence of any internet path was itself a control — even a compromised pod had nowhere to send data. It also saved the NAT gateway data-processing bill.

---

### Q10. S3 bucket policy pitfalls — what are the common ways buckets leak, and how do you lock one down?

**Answer:**

The headline S3 leaks are almost always *policy/ACL misconfiguration*, not an S3 bug:

- **Public ACLs / policies** — `"Principal": "*"` with `s3:GetObject`, or legacy object ACLs granting `AllUsers`/`AuthenticatedUsers`. The latter is insidious: "AuthenticatedUsers" means *any AWS account*, not your users.
- **Overly broad `Principal`** in the bucket policy, or `"Resource": "arn:...:bucket"` vs `"arn:...:bucket/*"` confusion (bucket-level vs object-level actions).
- **No default encryption / no TLS enforcement** — objects readable if creds leak; requests over plain HTTP.
- **Confused-deputy via bucket policy** granting a service without a source-account/ARN condition.

Lock-down pattern — **Block Public Access at account + bucket, enforce TLS, enforce encryption, deny non-owner:**

```hcl
resource "aws_s3_bucket" "docs" { bucket = "acme-customer-docs" }

resource "aws_s3_bucket_public_access_block" "docs" {
  bucket                  = aws_s3_bucket.docs.id
  block_public_acls       = true
  block_public_policy      = true
  ignore_public_acls       = true
  restrict_public_buckets  = true            # all four ON — belt and suspenders
}

resource "aws_s3_bucket_server_side_encryption_configuration" "docs" {
  bucket = aws_s3_bucket.docs.id
  rule { apply_server_side_encryption_by_default {
    sse_algorithm     = "aws:kms"
    kms_master_key_id = aws_kms_key.docs.arn } }
}

data "aws_iam_policy_document" "docs" {
  statement {                                 # deny any request not over TLS
    sid = "DenyInsecureTransport"
    effect = "Deny"
    principals { type = "*"; identifiers = ["*"] }
    actions = ["s3:*"]
    resources = [aws_s3_bucket.docs.arn, "${aws_s3_bucket.docs.arn}/*"]
    condition { test = "Bool"; variable = "aws:SecureTransport"; values = ["false"] }
  }
  statement {                                 # deny uploads that aren't KMS-encrypted
    sid = "DenyUnencrypted"
    effect = "Deny"
    principals { type = "*"; identifiers = ["*"] }
    actions = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.docs.arn}/*"]
    condition { test = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"; values = ["aws:kms"] }
  }
}
```

For multi-tenant isolation, add **prefix conditions** so a role can only touch its tenant's prefix (`Resource: bucket/${tenant}/*` or an `s3:prefix` condition), rather than one giant shared bucket read by a broad role.

**Interview trap:** thinking Block Public Access is the whole story. BPA stops *public* exposure, but a bucket policy with an overly broad `Principal` (another AWS account, or `*` with only an IP condition) can still leak *cross-account*. And BPA doesn't stop an over-privileged internal role reading everything — that's IAM/prefix scoping.

---

### Q11. What is IRSA and why is it the right way to give pods AWS permissions?

**Answer:**

**IRSA = IAM Roles for Service Accounts** (EKS). It binds a Kubernetes **ServiceAccount** to an **IAM role** via OIDC, so each pod gets its *own* short-lived, scoped AWS credentials — no node-role sharing, no static keys.

Mechanics:
1. The EKS cluster has an **OIDC provider**; you register it as an IAM identity provider.
2. You annotate a ServiceAccount with `eks.amazonaws.com/role-arn`.
3. EKS's admission webhook injects a projected **service-account token** (a signed OIDC JWT) and `AWS_WEB_IDENTITY_TOKEN_FILE` env into the pod.
4. The AWS SDK calls `AssumeRoleWithWebIdentity`, presenting that JWT; STS verifies it against the cluster OIDC provider and the role's trust policy, and returns temp creds.

The role's trust policy scopes it to a **specific namespace + service account** via the OIDC `sub` condition — that's the least-privilege lever:

```hcl
data "aws_iam_policy_document" "irsa_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals { type = "Federated"; identifiers = [aws_iam_openid_connect_provider.eks.arn] }
    condition {                               # only this SA in this namespace
      test     = "StringEquals"
      variable = "${local.oidc}:sub"
      values   = ["system:serviceaccount:app:embedding-worker"]
    }
    condition {                               # audience check
      test     = "StringEquals"
      variable = "${local.oidc}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}
```

Why it beats the alternatives:
- vs **node instance role** — the node role is shared by *every* pod on the node; give it S3 access and every pod (including a compromised one) has it. IRSA is per-workload.
- vs **static keys in a Secret** — no long-lived credential to leak; auto-rotated by STS.
- It composes with **blocking IMDS from pods** (hop limit 1 / deny 169.254.169.254 at the network layer), so even SSRF in a pod yields nothing.

The newer **EKS Pod Identity** is the successor (simpler association API, no per-cluster OIDC trust editing) — same principle, per-workload scoped roles.

**Interview trap:** giving the *node group* role the app's permissions "to keep it simple." That's the "every pod is admin" anti-pattern; a single compromised sidecar inherits it. IRSA/Pod Identity exists specifically to scope per-workload.

---

### Q12. Explain Kubernetes RBAC. Give a vulnerable→fixed Role example.

**Answer:**

K8s RBAC has four objects:
- **Role** (namespaced) / **ClusterRole** (cluster-wide) — a set of allowed `verbs` on `resources` (and optional `resourceNames`).
- **RoleBinding** / **ClusterRoleBinding** — grant a Role/ClusterRole to **subjects** (users, groups, service accounts).

It's **additive and deny-by-default**: no rule → denied; there are no deny rules (you remove access by not granting it). A ClusterRole can be bound cluster-wide (ClusterRoleBinding) or in one namespace (RoleBinding).

**Vulnerable — the "just make it work" cluster-admin binding:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata: { name: app-admin }
roleRef: { kind: ClusterRole, name: cluster-admin, apiGroup: rbac.authorization.k8s.io }
subjects:
  - kind: ServiceAccount
    name: default            # the DEFAULT SA, used by every pod that doesn't set one
    namespace: app
```

This gives *every pod in `app`* full cluster admin. A single RCE in any container → own the cluster, read every Secret, every namespace. `cluster-admin` bound to a service account is the classic finding.

**Fixed — a minimal namespaced Role bound to a dedicated SA:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata: { name: embedding-worker, namespace: app }
automountServiceAccountToken: false          # don't mount the token unless needed
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: embedding-worker, namespace: app }
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]                    # exactly what it needs, nothing more
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["embedding-worker-config"] # scoped to ONE secret by name
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: embedding-worker, namespace: app }
roleRef: { kind: Role, name: embedding-worker, apiGroup: rbac.authorization.k8s.io }
subjects: [{ kind: ServiceAccount, name: embedding-worker, namespace: app }]
```

Rules of thumb: never bind `cluster-admin` to a service account; scope `secrets` access with `resourceNames`; avoid `*` verbs/resources; audit for `escalate`/`bind`/`impersonate` verbs and for `create` on `pods`/`pods/exec` (a path to running arbitrary workloads).

**Interview trap:** believing RBAC has deny rules or that "the most specific rule wins." It's purely additive-allow, no deny — you constrain by *granting less*. Also: the `default` service account is auto-mounted into pods unless you turn it off; binding anything to it is binding to everything.

---

### Q13. "Kubernetes Secrets are encrypted." True or false? What do you do about it?

**Answer:**

**False by default.** A K8s Secret is just base64-encoded data stored in **etcd in plaintext** (base64 is encoding, not encryption — trivially reversible). Anyone with:
- read access to the Secret via the API (RBAC `get secrets`), or
- read access to **etcd** (etcd backups, a node with etcd, a disk snapshot), or
- ability to exec into a pod that mounts it,

…gets the cleartext.

What you actually do:
1. **Encryption at rest for etcd** — configure the API server's `EncryptionConfiguration` so Secrets are encrypted before hitting etcd, ideally with a **KMS provider** (envelope encryption to cloud KMS) rather than a static local key:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: ["secrets"]
    providers:
      - kms:                                  # envelope-encrypt via external KMS
          apiVersion: v2
          name: aws-kms
          endpoint: unix:///var/run/kmsplugin/socket.sock
      - identity: {}                          # fallback for reads of old data
```

2. **Tighten RBAC** — very few subjects should have `get/list secrets` (Q12); base64 is not a control.
3. **Prefer external secret stores** — mount from AWS Secrets Manager / Vault via the **Secrets Store CSI driver** or **External Secrets Operator**, so the source of truth is a real secrets manager with rotation and audit, and the K8s Secret is short-lived/synced.
4. **Don't put secrets in env vars** where avoidable — they leak via `/proc`, crash dumps, and child processes; mount as files (tmpfs) instead.
5. **Disable auto-mount** of the SA token where not needed; it's a bearer credential to the API server.

**Interview trap:** "Kubernetes encrypts Secrets so they're safe." They're base64, plaintext in etcd unless *you* enable encryption-at-rest (ideally KMS-backed). Saying otherwise is an instant senior-level red flag.

---

### Q14. What are Pod Security Standards, and what does a hardened pod spec look like?

**Answer:**

**Pod Security Standards (PSS)** replaced the deprecated PodSecurityPolicy. Three levels enforced by the built-in **Pod Security Admission** controller at the namespace level via labels:

- **Privileged** — no restrictions (for infra/system workloads only).
- **Baseline** — blocks the well-known dangerous stuff (host namespaces, privileged containers, most hostPath, hostPort).
- **Restricted** — hardened best practice: non-root, no privilege escalation, drop all capabilities, seccomp `RuntimeDefault`, read-only root fs recommended.

Enforce per namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app
  labels:
    pod-security.kubernetes.io/enforce: restricted   # reject non-compliant pods
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted     # log violations too
    pod-security.kubernetes.io/warn: restricted
```

A **Restricted-compliant, hardened** pod:

```yaml
apiVersion: v1
kind: Pod
metadata: { name: embedding-worker, namespace: app }
spec:
  serviceAccountName: embedding-worker
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    fsGroup: 10001
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: worker
      image: registry.example.com/worker@sha256:abc123...   # pin by digest, not tag
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        privileged: false
        capabilities: { drop: ["ALL"] }        # drop every Linux capability
      resources:                               # limits prevent noisy-neighbor DoS
        requests: { cpu: "250m", memory: "512Mi" }
        limits:   { cpu: "1",    memory: "1Gi" }
      volumeMounts:
        - { name: tmp, mountPath: /tmp }       # writable scratch since rootfs is RO
  volumes:
    - name: tmp
      emptyDir: {}
```

The high-value items: `runAsNonRoot`, `allowPrivilegeEscalation: false`, `drop ALL` capabilities, `readOnlyRootFilesystem`, `seccompProfile RuntimeDefault`, resource limits, and image pinned by **digest**. Together they mean a container escape has to defeat far more than a default pod.

**Interview trap:** referencing **PodSecurityPolicy** — it was removed in v1.25. Current answer is **Pod Security Admission + PSS levels**, and for anything more granular, a policy engine (Q15).

---

### Q15. What are admission controllers and how do you use OPA/Gatekeeper or Kyverno for policy?

**Answer:**

**Admission controllers** intercept requests to the API server *after* authn/authz but *before* the object is persisted. Two kinds matter:
- **Validating** — accept/reject (e.g., "reject any image not from our registry").
- **Mutating** — modify the object (e.g., inject a sidecar, set default securityContext).

The built-in **Pod Security Admission** (Q14) is one validating controller. For custom org policy you add a **policy engine** via `ValidatingAdmissionWebhook`:
- **OPA Gatekeeper** — policies in Rego as `ConstraintTemplate` + `Constraint` CRDs.
- **Kyverno** — policies as native YAML CRDs (lower learning curve, K8s-native).
- **ValidatingAdmissionPolicy** — the newer built-in CEL-based option (no external engine).

Example Kyverno policy: *disallow `:latest` tags and require images from the trusted registry* (supply-chain control):

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: trusted-images }
spec:
  validationFailureAction: Enforce            # reject, don't just audit
  rules:
    - name: only-trusted-registry
      match: { any: [{ resources: { kinds: ["Pod"] } }] }
      validate:
        message: "Images must come from registry.example.com and be digest-pinned."
        pattern:
          spec:
            containers:
              - image: "registry.example.com/*@sha256:*"   # registry + digest required
```

Use admission control to enforce, cluster-wide and unbypassably, the things a pod spec *should* have but a developer might forget: no privileged pods, resource limits present, only signed/trusted images, no `hostPath`, required labels, network policy present. It's the "make the secure path the only path" layer.

**Interview trap:** confusing admission controllers with RBAC. RBAC decides *may this subject do this action*; admission controllers decide *is this specific object acceptable* (and can mutate it). You need both — RBAC alone can't say "images must be digest-pinned."

---

### Q16. Kubernetes NetworkPolicy — what's the default, and how do you achieve zero-trust pod networking?

**Answer:**

**Default: all pods can talk to all pods, all namespaces, all egress.** A flat network — a compromised pod can reach the whole cluster, every database, the cloud metadata endpoint, and the internet. NetworkPolicies are **deny-by-default *once you select a pod*** — an empty policy that selects a pod denies all traffic to/from it, then you add allow rules.

Zero-trust recipe per namespace:
1. **Default-deny all ingress and egress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-all, namespace: app }
spec:
  podSelector: {}                    # selects ALL pods in the namespace
  policyTypes: ["Ingress", "Egress"]
  # no ingress/egress rules = deny everything
```

2. **Explicitly allow only needed flows** — e.g., the API accepts ingress only from the ingress controller, and egresses only to the DB and DNS:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-allow, namespace: app }
spec:
  podSelector: { matchLabels: { app: api } }
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from: [{ namespaceSelector: { matchLabels: { name: ingress-nginx } } }]
      ports: [{ port: 8080, protocol: TCP }]
  egress:
    - to: [{ podSelector: { matchLabels: { app: postgres } } }]
      ports: [{ port: 5432, protocol: TCP }]
    - to: [{ namespaceSelector: {} , podSelector: { matchLabels: { k8s-app: kube-dns } } }]
      ports: [{ port: 53, protocol: UDP }, { port: 53, protocol: TCP }]  # DNS
```

Caveats: NetworkPolicy needs a **CNI that enforces it** (Calico, Cilium; some don't). Blocking egress also blocks **169.254.169.254** (IMDS) as a side benefit. For L7 (HTTP path/method) rules you need Cilium or a service mesh. Don't forget to allow DNS or everything breaks in confusing ways.

**Production war story:** a customer's cluster had zero NetworkPolicies. During a tabletop we showed that a compromised front-end pod could open a shell to the internal admin service *and* reach the RDS instance directly (SG allowed the whole VPC CIDR). We rolled out default-deny + explicit allows namespace by namespace. The eye-opener for their team: the app kept working with 6 allow rules — everything else it had been "able" to reach was attack surface, not function.

---

### Q17. How do you secure the container supply chain — image signing, SBOM, and scanning?

**Answer:**

The supply chain is: base image → dependencies → build → registry → deploy → run. Controls at each stage:

- **Minimal base images** — distroless / Alpine / scratch; fewer packages = smaller attack surface and fewer CVEs. No shell in the image blunts post-exploitation.
- **Image scanning** — `trivy` / `grype` in CI scan for known-vuln packages and OS CVEs; fail the build on Critical/High with a fixable version. Re-scan in the registry continuously (new CVEs appear for old images).
- **SBOM (Software Bill of Materials)** — generate with `syft` (SPDX/CycloneDX) at build; it's the inventory that lets you answer "are we affected by CVE-X / log4shell?" in minutes instead of days. Increasingly a contractual/regulatory requirement.
- **Image signing / provenance** — sign images with **cosign** (Sigstore) so the cluster only runs images you built. Pair with **SLSA provenance** attestations (what source + builder produced this digest). Enforce at admission (Q15): reject unsigned images.
- **Pin by digest, not tag** — `@sha256:...` is immutable; `:latest` or `:v1` can be repointed at a malicious image after you scanned it (TOCTOU).

```yaml
# CI: build, scan, SBOM, sign
- run: docker build -t $IMG .
- run: trivy image --exit-code 1 --severity CRITICAL,HIGH --ignore-unfixed $IMG
- run: syft $IMG -o spdx-json > sbom.json          # SBOM
- run: cosign sign --key env://COSIGN_KEY $IMG      # signature + attestation
- run: cosign attest --predicate sbom.json --type spdxjson --key env://COSIGN_KEY $IMG
```

Then a Kyverno/cosign policy in the cluster verifies the signature before admitting the pod, closing the loop: only signed, scanned, digest-pinned images from your registry run.

**Interview trap:** treating "we scan images" as supply-chain security. Scanning finds *known* CVEs at one point in time; it doesn't stop a *tampered* image or tell you *what's inside* later. You need signing (integrity/provenance) + SBOM (inventory) + continuous re-scan + admission enforcement, not just a one-shot Trivy run.

---

### Q18. What is runtime security and where does something like Falco fit?

**Answer:**

Everything above is **build/deploy-time** (shift-left). **Runtime security** catches what slips through — a zero-day exploit, an insider, a compromised dependency that only acts maliciously at runtime. **Falco** (CNCF) is the canonical open-source runtime detector: it taps the kernel via **eBPF** and evaluates syscall streams against rules, alerting on suspicious *behavior*:

- A shell spawned inside a container (`bash` in a distroless pod = almost certainly compromise).
- A process reading `/etc/shadow`, or writing to a normally read-only path.
- Unexpected outbound network connections (a batch worker suddenly dialing the internet).
- A process attempting to reach `169.254.169.254` (IMDS access from a pod that shouldn't).
- `kubectl exec` into production pods (audit/insider).

```yaml
# Falco rule: alert on a shell in any container in the 'app' namespace
- rule: Shell spawned in app container
  desc: Interactive shell in a namespace that should have none
  condition: >
    spawned_process and container and shell_procs
    and k8s.ns.name = "app"
  output: "Shell in app pod (proc=%proc.cmdline pod=%k8s.pod.name image=%container.image.repository)"
  priority: WARNING
  tags: [container, shell, mitre_execution]
```

Where it fits in defense-in-depth: PSS/admission/network policy *reduce* what an attacker can do; Falco *tells you when they're doing it anyway*, feeding your incident-response pipeline (see `09_appsec_testing_and_incident_response.md`). Cloud-native equivalents/complements: **GuardDuty** (AWS account/EKS threat detection), **Tetragon** (Cilium eBPF), and admission-time policy for prevention. The layered model: *prevent* (admission, PSS, netpol, least-priv IAM) → *detect* (Falco, GuardDuty, audit logs) → *respond* (runbooks, IR).

**Interview trap:** thinking prevention (shift-left) is sufficient. Design-time controls have gaps (zero-days, logic bugs, insiders); runtime detection is the shift-right half. A mature posture does both — and the detection output is only useful if it's wired to an on-call runbook, not a dashboard nobody watches.

---

### Q19. Full vulnerable→fixed Terraform: an over-permissioned app role and its least-privilege replacement.

**Answer:**

The most common cloud finding in a customer account is a role with `*:*` or a service-wide `s3:*` "to unblock the team."

**Vulnerable:**

```hcl
resource "aws_iam_role_policy" "app" {
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:*", "kms:*", "secretsmanager:*", "dynamodb:*"]   # service-wide
      Resource = "*"                                                    # every resource
    }]
  })
}
```

Problems: a compromised app can read/delete **every** bucket in the account, decrypt with **any** key, read **all** secrets. There's no tenant/prefix scoping, no condition, no separation between read and admin actions. This is the SSRF/RCE force-multiplier.

**Fixed — scoped actions, scoped resources, conditions, deny on management actions:**

```hcl
data "aws_iam_policy_document" "app" {
  statement {
    sid     = "DocsBucketObjectsOnly"
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.docs.arn}/*"]        # objects, this bucket only
  }
  statement {
    sid     = "ListOwnPrefixOnly"
    effect  = "Allow"
    actions = ["s3:ListBucket"]
    resources = [aws_s3_bucket.docs.arn]
    condition {                                          # can only list its tenant prefix
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["$${aws:PrincipalTag/tenant}/*"]
    }
  }
  statement {
    sid     = "EnvelopeKeyUseOnly"
    effect  = "Allow"
    actions = ["kms:Decrypt", "kms:GenerateDataKey"]     # use, not manage
    resources = [aws_kms_key.docs.arn]                   # this key only
  }
  statement {
    sid     = "AppSecretsRead"
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = ["arn:aws:secretsmanager:${var.region}:${var.account}:secret:prod/app/*"]
  }
  statement {
    sid     = "DenyKeyAndSecretAdmin"                    # explicit deny = can't escalate
    effect  = "Deny"
    actions = ["kms:PutKeyPolicy", "kms:ScheduleKeyDeletion",
               "secretsmanager:DeleteSecret", "secretsmanager:PutSecretValue",
               "iam:*"]
    resources = ["*"]
  }
}
```

Principles applied: **specific actions** (use vs manage), **specific resources** (this bucket/key/secret ARN, not `*`), **conditions** for tenant scoping, and an **explicit deny** on privilege-escalation and destructive management actions so even a policy-editing bug can't grant them. Validate the result with IAM Access Analyzer / `iam policy simulator` and check for unused permissions with Access Analyzer's last-accessed data.

**Interview trap:** `s3:*` "because we do a lot of S3 things." List the actual actions — usually it's 3–4 (`GetObject/PutObject/ListBucket/DeleteObject`). Wildcards on actions *and* resources together is the finding auditors flag first.

---

### Q20. Put it together: what does a hardened baseline for a customer EKS + AWS deployment look like?

**Answer:**

The checklist I hand a customer's platform team as the deployment security baseline, grouped by layer:

**AWS account / IAM**
- SCPs on the OU: deny disabling CloudTrail/GuardDuty/Config, deny root usage, region allow-list.
- No IAM users with static keys for workloads — OIDC federation for CI, roles everywhere.
- Every role least-privilege (Q19), permission boundaries on delegated roles, Access Analyzer on.
- CloudTrail (org-wide, log-file validation on), GuardDuty, Config, Security Hub enabled.

**Network / data**
- Private subnets, no NAT where possible; VPC interface endpoints for KMS/Secrets Manager/S3 (Q9).
- Security groups reference SGs not CIDRs; egress locked down; DBs never `0.0.0.0/0`.
- S3: Block Public Access (all four), default KMS encryption, TLS-only + encryption-required bucket policies, prefix-scoped roles (Q10).
- KMS CMKs with tight key policies + rotation; Secrets Manager with tested rotation + monitoring (Q6, Q7).
- EC2/nodes: **IMDSv2 required, hop limit 1** (Q5).

**Kubernetes / EKS**
- **IRSA / Pod Identity** for per-workload AWS creds; pods blocked from IMDS (Q11).
- RBAC least-privilege, no `cluster-admin` on service accounts, `default` SA token auto-mount off (Q12).
- etcd **encryption at rest via KMS provider**; secrets sourced from Secrets Manager via CSI/ESO (Q13).
- Pod Security Admission = **restricted** on app namespaces; hardened securityContexts (Q14).
- **Default-deny NetworkPolicies** + explicit allows; CNI that enforces them (Q16).
- Admission policy (Kyverno/Gatekeeper): only signed, digest-pinned images from the trusted registry; resource limits required; no privileged pods (Q15, Q17).
- Supply chain: Trivy/Grype scan gate, Syft SBOM, cosign signing + verification (Q17).
- Runtime: Falco + GuardDuty EKS, alerts wired to on-call (Q18).

**Cross-cutting**
- Everything as IaC (Terraform), scanned with `checkov`/`tfsec` in CI (see `09`).
- Forensic-grade, tamper-evident audit logging (see `09`).

The FDE framing: you present this as a *shared* baseline, map each item to the customer's compliance obligations (SOC 2 / their framework — see `10`), and negotiate exceptions explicitly with an owner and residual-risk sign-off (see the threat-model file `07`) rather than silently dropping controls to hit a go-live date.

**Interview trap:** reciting the list as if you'd enforce all of it day one. Seniority is *sequencing* — land the crown-jewel controls first (least-priv IAM, IMDSv2, tenant isolation, no public buckets), then the defense-in-depth layers, and be explicit about what's deferred and why. A baseline nobody can adopt is as useless as no baseline.
