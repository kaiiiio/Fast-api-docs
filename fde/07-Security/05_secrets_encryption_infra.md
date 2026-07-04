# Secrets, Encryption & Infrastructure Security

As a Forward Deployed Engineer you are frequently the person who wires a customer's data into a cloud account you did not build, under a compliance regime you did not choose. That means you must be fluent in the mechanics — not just the vocabulary — of TLS, KMS envelope encryption, secrets management, and VPC-level isolation, because in customer environments *you* are often the one who has to prove the design is safe. Everything below is framed defensively: how these mechanisms work, how they fail, and how to answer when an interviewer probes whether you actually understand them or have only used the SDK.

---

### Q1. What is the difference between encryption at rest and encryption in transit, and why do you need both?

**Answer:**

They defend against different attackers with different access:

- **Encryption in transit** protects data moving over a network (TLS, mTLS, SSH tunnels, IPsec). Threat model: an attacker on the network path — compromised WiFi, a rogue router, a malicious peer in a shared VPC, a cloud provider's internal backbone tap. Guarantees: confidentiality, integrity, and (via certificates) authentication of the endpoint.
- **Encryption at rest** protects data sitting on storage media (EBS volumes, S3 objects, RDS data files, backups, snapshots). Threat model: stolen disks, decommissioned hardware, snapshots copied to the wrong account, an attacker who gains raw block access but not the key.

You need both because each is useless against the other's attacker: TLS does nothing once the bytes land on disk, and disk encryption does nothing for packets on the wire. Note also what *neither* protects against: a compromised application process reads plaintext regardless, because data is decrypted for use. That's why "we encrypt everything" is a weak answer — the real question is always **who holds the keys and when is the data plaintext**.

**Interview trap:** Candidates say "RDS is encrypted so an SQL injection can't read the data." Wrong layer entirely. Storage-level encryption is transparent to the database engine — any query, legitimate or injected, sees plaintext. At-rest encryption protects the *media*, not the *access path*. If the interviewer asks what protects against application-level compromise, the answers are field/application-level encryption, least-privilege IAM, and query parameterization — not SSE.

---

### Q2. Walk me through the TLS 1.3 handshake. What changed from TLS 1.2?

**Answer:**

TLS 1.3 (RFC 8446) redesigned the handshake for speed and security:

```
  Client                                             Server

  ClientHello
    + supported_versions (1.3)
    + key_share (client's ECDHE public key,
      speculatively for e.g. x25519)
    + signature_algorithms, ALPN, SNI
                        -------->
                                              ServerHello
                                                + key_share (server ECDHE pub)
                                     {EncryptedExtensions}
                                     {Certificate}
                                     {CertificateVerify}   <- signs transcript
                                     {Finished}
                        <--------
  {Finished}
  [Application Data]    <------->   [Application Data]

  { } = encrypted with handshake keys
  [ ] = encrypted with application traffic keys
```

Key points, in the order an interviewer wants them:

1. **1-RTT handshake.** The client *guesses* the key-exchange group and sends its ephemeral key share in the very first flight (ClientHello). The server replies with its own key share, and both sides can derive keys immediately. TLS 1.2 needed 2 round trips. (If the server doesn't support the guessed group, it sends a HelloRetryRequest — a rare extra round trip.)
2. **RSA key exchange is gone.** In TLS 1.2 the client could encrypt a pre-master secret with the server's long-lived RSA public key. That meant anyone who later stole the server's private key could decrypt *recorded past traffic*. TLS 1.3 permits only (EC)DHE key exchange.
3. **Forward secrecy is mandatory.** Because both sides use ephemeral ECDHE keys thrown away after the handshake, compromise of the server's certificate private key does not decrypt past sessions. The cert key is used only to *sign* the handshake transcript (CertificateVerify), proving identity — never to encrypt session secrets.
4. **Most of the handshake is encrypted.** Everything after ServerHello (including the server certificate) is encrypted with handshake-derived keys, unlike 1.2 where certificates went in the clear.
5. **Legacy cruft removed:** static RSA/DH, CBC-mode MAC-then-encrypt suites, RC4, SHA-1, compression, renegotiation. Only AEAD suites remain (AES-GCM, ChaCha20-Poly1305).

**Interview trap:** "Forward secrecy means the session can't be decrypted if the session key leaks." No — forward secrecy means past sessions stay safe if the *long-term* (certificate) key leaks. If the ephemeral session key itself leaks, that session is obviously readable. Precision here signals you actually know the property.

---

### Q3. What is 0-RTT in TLS 1.3 and why is it dangerous?

**Answer:**

0-RTT ("early data") lets a client that has previously connected to a server send application data in its *first* flight, encrypted with a key derived from a PSK (pre-shared key / session ticket) from the earlier session. Latency win: the request rides along with the ClientHello.

The danger is **replay**. The server has not yet contributed any randomness when it decrypts early data, so it cannot distinguish a fresh request from a copy. An attacker who records the 0-RTT flight can replay it — to the same server or to another server in the cluster that shares ticket keys. Consequences:

- `POST /transfer?amount=500` replayed 50 times.
- Even a replayed GET can be a side-channel or trigger non-idempotent side effects (analytics, rate-limit consumption, one-time tokens).

Also note 0-RTT data has **weaker forward secrecy** — it's protected by the PSK, so a leaked ticket key decrypts recorded early data.

Mitigations you should be able to list: only allow 0-RTT for idempotent requests (CDNs typically restrict it to GET without side effects); server-side single-use ticket enforcement / anti-replay caches (expensive across a fleet); or simply disable early data — nginx: `ssl_early_data off;` (the default). If enabling it behind a proxy, forward the `Early-Data: 1` header and have the app respond `425 Too Early` for anything non-idempotent.

**Production war story:** A customer's platform team enabled `ssl_early_data on` on their edge nginx for a latency KPI, and forwarded early data to *all* routes. Their coupon-redemption endpoint was a POST with an idempotency check keyed on a client-generated UUID — but the replayed request carried the *same* UUID and the check was "insert or return existing", so it looked fine… until we noticed the rate limiter counted each replay, letting an attacker exhaust other users' quotas by replaying their captured flights. Fix: `proxy_set_header Early-Data $ssl_early_data;` plus a middleware returning 425 on any early non-GET. The lesson: 0-RTT safety is an *application property*, not a TLS config toggle.

---

### Q4. How do you set up mutual TLS (mTLS) between two Node.js services?

**Answer:**

In plain TLS only the server proves its identity. In mTLS the server *also* demands a client certificate signed by a CA it trusts, giving strong service-to-service authentication (the basis of most service meshes — Istio, Linkerd — and of SPIFFE identities).

Setup steps: (1) create/operate an internal CA, (2) issue a server cert (with correct SANs) and a client cert per service identity, (3) configure the server to request and verify client certs, (4) configure clients with their cert/key and the CA bundle.

Server (`node:https`):

```typescript
import https from "node:https";
import { readFileSync } from "node:fs";
import type { TLSSocket } from "node:tls";

const server = https.createServer(
  {
    key: readFileSync("/etc/pki/server.key"),
    cert: readFileSync("/etc/pki/server.crt"),        // leaf + intermediates
    ca: readFileSync("/etc/pki/internal-ca.crt"),     // CA that signed CLIENT certs
    requestCert: true,           // ask the client for a certificate
    rejectUnauthorized: true,    // kill the handshake if it's missing/invalid
    minVersion: "TLSv1.3",
  },
  (req, res) => {
    const socket = req.socket as TLSSocket;
    // Defense in depth: authorize on the certificate identity, not just its validity
    const peer = socket.getPeerCertificate();
    if (peer.subject?.CN !== "billing-service.internal") {
      res.writeHead(403).end("client identity not allowed");
      return;
    }
    res.writeHead(200).end(`hello ${peer.subject.CN}`);
  }
);
server.listen(8443);
```

Client:

```typescript
import https from "node:https";
import { readFileSync } from "node:fs";

const agent = new https.Agent({
  key: readFileSync("/etc/pki/billing-client.key"),
  cert: readFileSync("/etc/pki/billing-client.crt"),
  ca: readFileSync("/etc/pki/internal-ca.crt"),  // CA that signed the SERVER cert
  // rejectUnauthorized defaults to true — never set it to false
});

const res = await fetch("https://payments.internal:8443/charge", {
  // @ts-expect-error Node fetch accepts dispatcher/agent via undici options;
  // with node:https use https.request({ agent }) instead if preferred
  agent,
});
```

Critical details interviewers probe:

- **`rejectUnauthorized: false` is never a fix.** It disables all certificate verification — you have encryption with an unauthenticated stranger, i.e., trivially MITM-able. The correct fix for "self-signed cert error" is passing the right `ca` bundle.
- Validity ≠ authorization. Any cert from your CA passes the handshake; you must still check *which* identity connected (CN/SAN allow-list, as above) unless you run one CA per trust domain.
- Client cert rotation hurts: plan short-lived certs with automated issuance (Vault PKI engine, step-ca, ACME internally) rather than year-long certs and a pager alarm.

**Interview trap:** "We use mTLS, so we don't need authorization." mTLS answers *who is calling*; it says nothing about *what they may do*. Authentication and authorization stay separate layers even with client certs.

---

### Q5. Explain envelope encryption. Why does every cloud KMS use it?

**Answer:**

Envelope encryption uses two tiers of keys:

- **DEK (data encryption key):** a symmetric key (e.g., AES-256) that actually encrypts your data, generated fresh per object/file/session.
- **KEK (key-encrypting key), the "master key" / KMS key:** lives *inside* the KMS/HSM boundary and never leaves it. Its only job is to encrypt (wrap) and decrypt (unwrap) DEKs.

```
                 ENCRYPT                                  DECRYPT
 ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
 │  App: kms.GenerateDataKey(KeyId)  │    │  App reads stored blob:           │
 │        │                          │    │   [encrypted DEK][ciphertext]     │
 │        ▼                          │    │        │                          │
 │  ┌───────────── KMS/HSM ────────┐ │    │        ▼                          │
 │  │ KEK (never leaves HSM)       │ │    │  kms.Decrypt(encryptedDEK)        │
 │  │  → returns:                  │ │    │  ┌───────────── KMS/HSM ────────┐ │
 │  │    Plaintext DEK             │ │    │  │ KEK unwraps → plaintext DEK  │ │
 │  │    CiphertextBlob (wrapped)  │ │    │  └──────────────┬───────────────┘ │
 │  └──────────────┬───────────────┘ │    │                 ▼                 │
 │                 ▼                 │    │  AES-GCM decrypt data locally     │
 │  AES-GCM encrypt data locally     │    │  zero out DEK from memory         │
 │  store: wrapped DEK + ciphertext  │    │                                   │
 │  discard plaintext DEK            │    │                                   │
 └───────────────────────────────────┘    └───────────────────────────────────┘
```

Why the pattern exists:

1. **Performance/scale.** The HSM can't stream terabytes through itself (KMS Encrypt caps payloads at 4 KB anyway). Bulk crypto happens locally with the DEK; KMS only touches 32-byte keys.
2. **Blast radius.** One DEK per object: leaking one DEK exposes one object, not the fleet.
3. **Cheap "rotation" and revocation.** The wrapped DEK is stored *with* the data. Disabling the KEK (or revoking Decrypt permission) instantly makes *all* dependent data undecryptable without re-writing a byte — this is also how "crypto-shredding" works for GDPR deletion.
4. **Auditability.** Every unwrap is a KMS API call → CloudTrail entry with IAM principal, encryption context, timestamp.

**Interview trap:** "KMS encrypts my data." KMS almost never encrypts your data; it encrypts your *keys*. If a candidate thinks S3 sends objects to KMS for encryption, they've never looked under the hood.

---

### Q6. Show the actual GenerateDataKey / Decrypt flow with AWS SDK v3 code.

**Answer:**

```typescript
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const kms = new KMSClient({ region: "us-east-1" });
const KEY_ID = "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab";

// Encryption context: authenticated, logged in CloudTrail, and REQUIRED
// (exact match) at decrypt time. Binds ciphertext to its purpose.
const context = { app: "billing", table: "invoices" };

export interface EnvelopeBlob {
  wrappedKey: Buffer;   // encrypted DEK — safe to store next to ciphertext
  iv: Buffer;           // 12 bytes
  tag: Buffer;          // 16-byte GCM auth tag
  ciphertext: Buffer;
}

export async function envelopeEncrypt(plaintext: Buffer): Promise<EnvelopeBlob> {
  const dk = await kms.send(
    new GenerateDataKeyCommand({
      KeyId: KEY_ID,
      KeySpec: "AES_256",
      EncryptionContext: context,
    })
  );
  const plaintextKey = Buffer.from(dk.Plaintext!);     // use immediately
  const wrappedKey = Buffer.from(dk.CiphertextBlob!);  // store with data

  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", plaintextKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { wrappedKey, iv, tag: cipher.getAuthTag(), ciphertext };
  } finally {
    plaintextKey.fill(0); // never let the plaintext DEK outlive its use
  }
}

export async function envelopeDecrypt(blob: EnvelopeBlob): Promise<Buffer> {
  const dk = await kms.send(
    new DecryptCommand({
      CiphertextBlob: blob.wrappedKey,
      EncryptionContext: context, // must match exactly or KMS refuses
      // KeyId optional here: the wrapped blob embeds the key ARN
    })
  );
  const plaintextKey = Buffer.from(dk.Plaintext!);
  try {
    const decipher = createDecipheriv("aes-256-gcm", plaintextKey, blob.iv);
    decipher.setAuthTag(blob.tag);
    return Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]);
  } finally {
    plaintextKey.fill(0);
  }
}
```

Points to narrate in an interview:

- `GenerateDataKey` returns **both** the plaintext DEK and the KEK-wrapped DEK in one call. You use the plaintext copy immediately and persist only the wrapped copy. (There's also `GenerateDataKeyWithoutPlaintext` for write-only producers that should never be able to decrypt.)
- `Decrypt` doesn't need the KeyId — the ciphertext blob encodes which KMS key wrapped it (for symmetric keys).
- **EncryptionContext** is AAD at the KMS layer: it doesn't hide anything, but decryption fails unless the caller presents the identical context, and it appears in CloudTrail. Use it to prevent "ciphertext confusion" (replaying invoice ciphertext into the users table).
- At scale, cache DEKs briefly (the AWS Encryption SDK does data-key caching with TTL and message limits) to avoid a KMS call per record — a classic cost/latency question.

---

### Q7. How do S3 SSE-KMS and RDS encryption actually work under the hood?

**Answer:**

Both are envelope encryption; only the granularity differs.

**S3 SSE-KMS:** On `PutObject`, S3 calls `GenerateDataKey` against your KMS key, gets a plaintext + wrapped DEK, encrypts the object with AES-256(-GCM) using the plaintext DEK, then stores the *wrapped* DEK in the object's metadata and discards the plaintext key. On `GetObject`, S3 calls `kms:Decrypt` on the stored wrapped DEK, decrypts, streams plaintext to you over TLS. Consequences worth stating:

- Reading an SSE-KMS object requires **both** `s3:GetObject` and `kms:Decrypt` on that key — a second, independent authorization gate. This is exactly why cross-account bucket sharing "mysteriously" fails: the key policy also has to grant the other account.
- Every object op used to mean a KMS call (throttling + cost at scale); **S3 Bucket Keys** fix this by having S3 derive per-bucket intermediate keys from one KMS call, cutting KMS traffic dramatically.
- SSE-S3 (`AES256`) is the same mechanics but with keys AWS manages opaquely — no key policy, no CloudTrail per-object decrypt trail, no cross-account control. SSE-KMS is what compliance teams actually want.

**RDS encryption:** volume-level, not row-level. The underlying EBS/Aurora storage volumes are encrypted with a DEK wrapped by your KMS key; the database engine itself sees plaintext pages in memory. Consequences:

- Snapshots, replicas, automated backups inherit encryption; you *cannot* encrypt an existing unencrypted instance in place — you snapshot, copy-with-encryption, restore (an FDE does this dance at customers constantly).
- Because it's transparent at the storage layer, it does nothing against SQL injection, a stolen DB password, or an over-privileged app role (see Q1). For field-level protection you encrypt in the application (envelope-encrypt the column) or use engine features like TDE-equivalents/pgcrypto with app-held keys.

**Interview trap:** "We turned on RDS encryption, so PII is protected." Follow-up question you should expect: protected from *whom*? From someone stealing the physical volume or an unencrypted snapshot copy — yes. From anyone with database credentials — not at all.

---

### Q8. Why are environment variables a weak place for secrets? Everyone uses them.

**Answer:**

Env vars are *convenient* and better than hardcoding, but they leak through many channels:

1. **Process inspection.** On Linux, `/proc/<pid>/environ` is readable by the same user and root; `ps eww` and debugging tools expose them. Any same-user compromise or container escape reads every secret at once.
2. **Child process inheritance.** `child_process.spawn` (and `exec`, shells, etc.) passes the *entire* environment by default. Your DB password gets inherited by ImageMagick, ffmpeg, git hooks — any of which might crash-dump or log it. Fix: pass an explicit `env: { PATH: process.env.PATH }` allowlist to spawned processes.
3. **Crash dumps & error reporting.** Core dumps contain the environment block. Worse, error trackers and "diagnostic" endpoints love to serialize `process.env` — several real incidents began with Sentry/debug pages capturing environment context.
4. **Logging & CI.** `printenv` in a debug step, `docker inspect` showing `Env`, Kubernetes `kubectl describe pod` showing env values set literally in the manifest, build logs echoing `docker build --build-arg SECRET=...` (build args persist in image history — never pass secrets that way; use BuildKit `--mount=type=secret`).
5. **`.env` files committed to git.** The classic. Once committed, the secret is in history forever — removing the file does not rotate the credential. Trufflehog/gitleaks scanning plus mandatory rotation on any leak.
6. **No lifecycle.** Env vars are set at process start and never expire, never rotate, and offer no audit trail of who read them.

Better patterns, in ascending order of maturity: files with tight permissions mounted at runtime (Kubernetes Secrets as volumes, Docker secrets at `/run/secrets`), fetched-at-boot from a secrets manager using the *platform identity* (IAM role, IRSA, workload identity) so only a bootstrap credential exists, and short-lived **dynamic secrets** (Q9) so leaks age out.

**Production war story:** At a customer, a Node worker spawned `pdftoppm` to rasterize uploaded PDFs. A malicious PDF triggered a segfault; the platform's crash handler helpfully uploaded core dumps to a shared, world-readable-within-the-org S3 bucket for debugging. The dump contained the inherited environment of the child process — including `DATABASE_URL` with the production password and a Stripe secret key, because spawn had passed the full env. Nobody "hacked" anything; the secrets just followed the process tree into a bucket with 400 humans able to read it. Remediation: env allowlist on every spawn, secrets moved to fetch-on-boot from Secrets Manager with a 24 h rotation, core dumps encrypted with a KMS key only the debugging role could decrypt.

---

### Q9. Compare HashiCorp Vault and AWS Secrets Manager. What are dynamic secrets?

**Answer:**

Both solve: central storage, encryption at rest, access control, audit, rotation. The philosophical difference is what a "secret" is.

**AWS Secrets Manager:** managed, IAM-native. Stores versioned secret strings/JSON; rotation via Lambda functions (built-ins for RDS/Redshift/DocumentDB do the connect-and-`ALTER USER` dance); resource policies for cross-account; CloudTrail audit; ~$0.40/secret/month + API calls. Retrieval:

```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient({ region: "us-east-1" });

export async function getDbCreds(): Promise<{ username: string; password: string }> {
  const res = await sm.send(
    new GetSecretValueCommand({ SecretId: "prod/billing/db" })
  );
  return JSON.parse(res.SecretString!);
  // Cache with a TTL shorter than the rotation window, and retry on auth
  // failure by re-fetching — that handles the rotation race gracefully.
}
```

The app authenticates with its IAM role — no secret needed to fetch secrets, which solves the "secret zero" bootstrap problem inside AWS.

**Vault:** platform-agnostic, richer engines. KV storage is table stakes; the differentiators are **dynamic secrets** and the PKI/transit engines. Auth methods (Kubernetes SA, AWS IAM, AppRole, OIDC) map workloads to policies; every secret is tied to a **lease** that expires and can be revoked.

**Dynamic secrets** flip the model: instead of storing a long-lived DB password, Vault holds a privileged root credential and *creates a brand-new DB user on demand* per requesting workload, with a TTL:

```
vault read database/creds/billing-readonly
  -> username: v-k8s-billing-x7Qp   password: A1b2...   lease: 1h
```

When the lease expires (or is revoked), Vault drops the DB user. Properties interviewers want to hear: every consumer has a *unique* credential (perfect attribution in DB logs), leaked credentials die within the TTL, revocation is instant and surgical, and "rotation" stops being an event because nothing is long-lived. Same idea powers Vault's dynamic AWS IAM credentials and its PKI engine issuing short-lived mTLS certs (Q4).

Choosing: all-in on AWS with modest needs → Secrets Manager (zero ops). Multi-cloud/on-prem, need dynamic secrets, PKI, or encryption-as-a-service (transit engine) → Vault, but budget for operating it (unsealing, HA, upgrade discipline) or pay for HCP Vault.

---

### Q10. What does a real secret-rotation strategy look like?

**Answer:**

Rotation is a *distributed systems* problem disguised as a security checkbox. Naive rotation ("change the password, update the secret") causes outages because running instances hold the old value in memory.

The standard is **two-phase / dual-credential rotation** (what Secrets Manager's `AWSPENDING`/`AWSCURRENT` staging labels implement):

1. **Create** a new credential alongside the old (`createSecret` → new version staged `AWSPENDING`). For databases this is often an *alternating user* pattern: `app_user_a` / `app_user_b`, rotate the one not currently live.
2. **Set** it in the target service (`setSecret` — actually change the password on the DB for the pending user).
3. **Test** the new credential works (`testSecret`).
4. **Finish**: promote `AWSPENDING` → `AWSCURRENT`. Old credential remains valid as `AWSPREVIOUS` during the overlap window, then is disabled.

Client-side requirements that make it seamless:

- Fetch secrets with a **TTL cache** shorter than the overlap window; on an auth error, bust the cache and re-fetch once before failing (handles the race where you fetched seconds before promotion).
- Never bake secrets into AMIs/images or long-lived env vars — those can't rotate without redeploys.
- Rotate on a schedule (30–90 days for static secrets), **immediately** on personnel departure or suspected leak, and remember: *deleting a leaked secret from git/logs is not rotation* — the only remediation for exposure is invalidating the credential.
- KMS-layer note: enabling automatic KMS key rotation rotates the *backing key material* inside AWS; old ciphertexts still decrypt (KMS keeps prior material). It does **not** re-encrypt your data and does not save you if a *DEK* leaked — different layers, different rotations.

**Interview trap:** "We rotate every 90 days, so a leaked key is exposed at most 90 days." Only if the leak happens the second after rotation *and* nobody notices. The stronger answer: scheduled rotation limits *silent* exposure windows; detection + immediate revocation handles *known* leaks; dynamic short-TTL secrets (Q9) shrink both to minutes.

---

### Q11. Show me how to encrypt data correctly with AES-256-GCM in Node.js.

**Answer:**

GCM is an AEAD mode: it provides confidentiality *and* integrity (a 16-byte authentication tag), plus optional AAD — data that is authenticated but not encrypted. The complete, correct pattern:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;   // 96-bit nonce — the GCM-native size; do not "upgrade" to 16
const TAG_LEN = 16;  // 128-bit tag — never truncate

/**
 * Output layout: [ 12-byte IV | 16-byte tag | ciphertext ]
 * The IV is NOT secret — it must only be UNIQUE per (key, message).
 */
export function encrypt(
  key: Buffer,            // exactly 32 random bytes (e.g., a KMS data key)
  plaintext: Buffer,
  aad?: Buffer            // e.g., record ID / tenant ID — binds ciphertext to context
): Buffer {
  if (key.length !== 32) throw new Error("AES-256 key must be 32 bytes");

  const iv = randomBytes(IV_LEN);           // fresh random nonce EVERY call
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  if (aad) cipher.setAAD(aad, { plaintextLength: plaintext.length });

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();          // available only AFTER final()

  return Buffer.concat([iv, tag, ciphertext]);
}

export function decrypt(key: Buffer, blob: Buffer, aad?: Buffer): Buffer {
  if (blob.length < IV_LEN + TAG_LEN) throw new Error("ciphertext too short");

  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = blob.subarray(IV_LEN + TAG_LEN);

  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);                 // set BEFORE final()
  if (aad) decipher.setAAD(aad, { plaintextLength: ciphertext.length });

  // final() throws if the tag doesn't verify — tampering, wrong key, wrong AAD.
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Usage: bind a ciphertext to its database row so ciphertexts can't be swapped
const key = randomBytes(32); // in production: KMS data key, never hardcoded
const aad = Buffer.from("user:42,field:ssn");
const blob = encrypt(key, Buffer.from("123-45-6789"), aad);
const back = decrypt(key, blob, aad); // throws if aad/user id differs
```

The checklist an interviewer is listening for:

1. **Random 12-byte IV per message**, stored alongside the ciphertext (it's not secret — uniqueness is the requirement, secrecy is not).
2. **Auth tag captured after `final()` and verified on decrypt** — skipping `setAuthTag` or ignoring the throw silently removes integrity.
3. **AAD** to bind ciphertext to context (row ID, tenant, version) so an attacker can't move a valid ciphertext where it doesn't belong.
4. Treat any decrypt failure as tamper — log it, don't retry-with-fallbacks.
5. Key from a KDF or KMS, never `Buffer.from(password)`. If deriving from a password, use `scrypt`/`argon2` with salt — but password-derived keys are for user-facing encryption, not service crypto.
6. Rekey before nonce-collision risk: with random 96-bit nonces, keep well under ~2³² messages per key (birthday bound); rotate DEKs long before that.

---

### Q12. What happens if a GCM nonce is reused? Why is it "catastrophic" and not just "weaker"?

**Answer:**

Two independent disasters, and this is the question that separates people who've read the spec from people who've read a blog title:

1. **Confidentiality: XOR of plaintexts leaks.** GCM is counter mode underneath: `C = P XOR keystream(key, nonce)`. Same key + same nonce → *identical keystream*. For two messages: `C1 XOR C2 = P1 XOR P2`. The keystream cancels out entirely. With any structure in the data (JSON, protocol headers, English text) crib-dragging recovers both plaintexts. If one plaintext is known (a predictable message), the other falls out immediately: `P2 = C1 XOR C2 XOR P1`.

2. **Integrity: forgery via authentication-key recovery.** This is the part candidates miss. GCM's tag is GHASH — polynomial evaluation over GF(2¹²⁸) keyed by `H = AES(key, 0¹²⁸)`. Given two ciphertext/tag pairs under the same (key, nonce), an attacker sets up two polynomial equations that differ only in known ciphertext terms; subtracting them eliminates the masking value `E(key, nonce‖counter0)` and yields a polynomial whose roots include **H itself** (the Joux "forbidden attack"). With `H` recovered, the attacker can compute valid tags for *arbitrary forged ciphertexts under that key* — not just the two colliding messages. One nonce reuse converts your authenticated cipher into an attacker-controlled one for the key's whole lifetime.

So: reuse leaks past data *and* destroys future integrity. That's why it's "catastrophic," and why real systems have burned on it — the practical example usually cited is KRACK (WPA2 key-reinstallation forcing nonce reuse) and various TLS AES-GCM implementations with bad IV generation (the 2016 "Nonce-Disrespecting Adversaries" research found live HTTPS servers with repeating nonces).

Defenses to enumerate:

- Random 96-bit nonce via `randomBytes(12)` per message (Q11), with per-key message limits.
- Or a **counter-based** nonce with durable, per-key monotonic state — hard to get right across restarts and replicas, which is exactly how bugs happen (see Q13).
- Nonce-misuse-resistant modes where the risk is structural: **AES-GCM-SIV** or XChaCha20-Poly1305 (192-bit nonce makes random collision negligible).
- One DEK per message (envelope encryption, Q5–Q6) sidesteps the problem: a "reused" nonce under a never-reused key is harmless.

---

### Q13. Here's encryption code you found in a customer codebase. Critique and fix it.

**Answer:**

**Vulnerable (composite of real code seen in the field):**

```typescript
// ❌ DO NOT USE — every line has a problem
import { createCipheriv } from "node:crypto";

const KEY = Buffer.from("my-super-secret-key-32-bytes-ok!"); // hardcoded, low entropy
const IV = Buffer.from("000000000000");                       // STATIC IV

export function encryptField(value: string): string {
  const cipher = createCipheriv("aes-256-gcm", KEY, IV);
  let out = cipher.update(value, "utf8", "base64");
  out += cipher.final("base64");
  return out;                                // auth tag thrown away!
}
```

Problems, ranked:

1. **Static IV with GCM** → every ciphertext under the same keystream → Q12's catastrophe: cross-record XOR leakage *and* GHASH key recovery. Equal plaintexts also produce equal ciphertexts (pattern leakage — you can spot every user with the same SSN prefix).
2. **Auth tag discarded** → decryption can't verify integrity; anyone who can write the column can substitute forged ciphertext (and with the static IV, can *craft* it).
3. **Hardcoded key in source** → in git history forever, visible to every developer and CI runner, unrotatable without a deploy.
4. ASCII key ≈ far less than 256 bits of entropy.
5. Legacy sibling you'll also see: `crypto.createCipher("aes-256-ecb", password)` — **ECB mode** encrypts identical 16-byte blocks to identical ciphertext blocks (the famous ECB-penguin image), has no IV and no integrity, and `createCipher`'s MD5-based key derivation was so bad Node removed the API entirely.

**Fixed:** use the Q11 `encrypt`/`decrypt` functions with a KMS-sourced data key (Q6), random per-message IV, tag stored with the ciphertext, AAD binding the field to its row. If old data exists, run a **re-encryption migration**: decrypt with the legacy path (flagged, temporary), re-encrypt with the new path, track a `enc_version` column — and rotate the exposed hardcoded key's data on the assumption it leaked.

**Interview trap:** When asked "how would you migrate", saying "just change the code" fails — existing rows decrypt only with the old scheme. The version-column + dual-read/single-new-write migration is the senior answer.

---

### Q14. Hashing vs encryption vs encoding — explain like I'm a junior, then like I'm a security reviewer.

**Answer:**

Junior version:

| | Reversible? | Needs a key? | Purpose | Examples |
|---|---|---|---|---|
| **Encoding** | Yes — by anyone | No | Data *representation* for transport/storage | Base64, hex, URL-encoding, UTF-8 |
| **Encryption** | Yes — with the key | Yes | **Confidentiality** | AES-GCM, ChaCha20-Poly1305, RSA-OAEP |
| **Hashing** | No (one-way) | No (HMAC adds one) | **Integrity / fingerprint / lookup** | SHA-256, BLAKE3 |
| **Password hashing** | No, deliberately slow | Salt (+ optional pepper) | Verify without storing | argon2id, bcrypt, scrypt |

Security-reviewer version — the distinctions that matter:

- **Encoding provides zero security.** `Buffer.from(s).toString("base64")` is a *representation change*; decoding requires no secret. Base64 "hides" data only from someone who doesn't try.
- **Encryption is two-way with a key** and the modern bar is *authenticated* encryption (AEAD) — plain CBC without a MAC is malleable and enables padding-oracle attacks.
- **Hashing is one-way**: fixed-size digest, no key, no inverse. Fine for checksums, content addressing, deduplication. **Not fine alone for passwords**: fast hashes let attackers try billions of guesses/sec against a stolen table, and unsalted hashes fall to rainbow tables and reveal duplicate passwords instantly.
- **Password storage needs a slow, salted, memory-hard KDF** — argon2id (preferred) or bcrypt/scrypt — where the cost factor is the defense.
- **HMAC** is keyed hashing: integrity + authenticity between parties sharing a key (webhook signatures, JWT HS256). It is still not encryption — the message may travel in plaintext beside its HMAC.

```typescript
import { createHash, createHmac, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Integrity fingerprint (fine): content hash
const digest = createHash("sha256").update(fileBuffer).digest("hex");

// Webhook verification (fine): HMAC + constant-time compare
export function verifyWebhook(payload: Buffer, sigHex: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(sigHex, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Password storage (fine; argon2id via the `argon2` package is better still)
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 2 ** 15, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
```

**Interview trap:** "We hash the credit card numbers for security." Card numbers have ~10¹⁵ effective values and known structure (BIN prefixes, Luhn) — an unsalted or even salted fast hash is brute-forceable per-record in minutes. Low-entropy data can't be protected by hashing; it needs encryption (or tokenization). Same reasoning applies to phone numbers, SSNs, and dates of birth.

---

### Q15. Real code: an API "encrypts" tokens with base64. What do you do?

**Answer:**

**Vulnerable (seen in the wild more than once):**

```typescript
// ❌ base64 is ENCODING, not encryption
export function encryptToken(userId: number, role: string): string {
  return Buffer.from(JSON.stringify({ userId, role, exp: Date.now() + 86_400_000 }))
    .toString("base64url");
}

export function decryptToken(token: string): { userId: number; role: string } {
  return JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  // any client can decode, EDIT { role: "admin" }, re-encode, and be admin
}
```

Anyone can decode it, flip `role` to `admin`, re-encode, and the server trusts it — this is a straight privilege-escalation vulnerability, not a style issue.

**Fixed — pick based on the actual requirement:**

If the server only needs to *trust* the claims (typical session/API token), you need **integrity**, not secrecy — sign it (or just use a vetted JWT/PASETO library, which is the real production answer):

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.TOKEN_KEY!; // from a secrets manager, rotated

export function signToken(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyToken(token: string): object | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return claims.exp > Date.now() ? claims : null; // enforce expiry server-side
}
```

If the claims must also be *hidden* from the client, use AEAD encryption (Q11) — which gives integrity for free. Note the fixed version still base64-encodes — encoding is fine as a *transport format*; the security came from the HMAC.

**Interview trap:** The interviewer shows you a "token" and asks what's wrong. Before anything else, paste-decode it mentally: if `eyJ...` (base64 of `{"`) is readable, say so — then ask whether the requirement is secrecy, integrity, or both, because that decides encrypt vs sign. Jumping straight to "use JWT" without that distinction is a mid-level answer.

---

### Q16. How does certificate chain validation actually work when a client connects to a server?

**Answer:**

Validation walks a chain from the presented cert up to a locally trusted anchor:

```
[Leaf: api.example.com]  <- signed by
      [Intermediate CA]  <- signed by
      [Root CA]          <- self-signed, lives in the CLIENT's trust store
```

Steps the client performs:

1. **Chain building.** Server sends its leaf + intermediates (a frequent outage cause: servers sending only the leaf — some clients fetch missing intermediates via AIA, many don't; always serve `fullchain.pem`). Roots are never sent — they must already be in the trust store (OS store, Mozilla NSS bundle, JVM cacerts, or Node's compiled-in Mozilla bundle unless `NODE_EXTRA_CA_CERTS` adds to it).
2. **Signature verification** at each link: leaf signed by intermediate's key, intermediate by root's key.
3. **Constraint checks** per cert: validity dates; `basicConstraints CA:TRUE` and path length on issuers (so a leaf can't sign other certs); key usage / extended key usage (`serverAuth`).
4. **Hostname verification** — separate from chain validity! The requested hostname must match a **SAN** entry (CN alone has been ignored by browsers since ~2017; wildcards match one label only: `*.example.com` covers `api.example.com`, not `a.b.example.com`). A perfectly valid chain for the *wrong host* must fail — skipping this check is the single most common TLS bug in custom HTTP clients.
5. **Revocation** — the weak spot:
   - **CRL:** CA publishes a signed list of revoked serials; clients download it. Huge, laggy, rarely consulted in practice.
   - **OCSP:** per-cert online status query. Adds latency, leaks browsing to the CA, and "soft-fail" clients treat an unreachable responder as "fine" — which an active MITM can force, making plain OCSP nearly decorative.
   - **OCSP stapling:** the *server* fetches a time-stamped signed OCSP response and staples it into the handshake — fixes latency and privacy; combined with `OCSP Must-Staple` in the cert it can actually hard-fail.
   - Industry direction: short-lived certs (Let's Encrypt 90 days, moving shorter) so revocation matters less; browsers push CRLite/aggregated revocation sets.
6. **Pinning:** the client additionally requires a specific key/cert (usually the SPKI hash) in the chain. Strong against rogue/compromised CAs; operationally dangerous — pin the wrong thing or rotate without a backup pin and you brick every client (HPKP was deprecated for exactly this). Sensible today only for first-party mobile apps / IoT with an update path, always with ≥2 pins (current + backup key held offline).

Node-specific: custom pinning goes in `checkServerIdentity` — and you must still call the default check, or you silently disable hostname verification:

```typescript
import tls from "node:tls";
import https from "node:https";
import { createHash } from "node:crypto";

const PINS = new Set([
  "kQ3JDDLyRQDgzRIO4TZ4CxDeVvNCeqEnxDFXGpXbcgs=", // current SPKI sha256
  "5kJvNEMw0KjrCAu7eXY5HZdvyCS13BbA0VJG1RSP91w=", // backup key
]);

const agent = new https.Agent({
  checkServerIdentity(host, cert) {
    const err = tls.checkServerIdentity(host, cert); // KEEP the default checks
    if (err) return err;
    const spki = createHash("sha256").update(cert.pubkey!).digest("base64");
    if (!PINS.has(spki)) return new Error(`certificate pin mismatch for ${host}`);
    return undefined;
  },
});
```

---

### Q17. `UNABLE_TO_VERIFY_LEAF_SIGNATURE` in a customer's Node service — what's your diagnosis path?

**Answer:**

This error means Node couldn't build a chain to a trusted root — almost always a *server-side chain* or *client trust store* problem, and the answer that gets you hired is a diagnosis path, not a flag flip:

1. **Inspect what the server actually sends:** `openssl s_client -connect host:443 -servername host -showcerts`. Count the certs. If only the leaf appears → the server is missing intermediates; fix is deploying `fullchain.pem` (leaf + intermediates), not touching the client.
2. **Corporate TLS interception?** If the issuer is `Zscaler`/`BlueCoat`/`Palo Alto` — the customer's egress proxy re-signs traffic with an internal CA. Fix: export that CA cert and add it via `NODE_EXTRA_CA_CERTS=/etc/pki/corp-ca.pem` (appends to Node's bundled Mozilla roots) — an everyday FDE situation on customer laptops and locked-down VPCs.
3. **Private/internal CA?** Same fix: distribute the internal root properly, or pass `ca:` in the agent options for that one connection.
4. **Expired root / old trust store** in a stale base image (the 2021 Let's Encrypt DST Root X3 expiry broke exactly this) → update `ca-certificates` in the image.

What you never do: `rejectUnauthorized: false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`. Both turn off verification entirely (the env var does it *process-wide*), converting "TLS error" into "silent MITM acceptance" — in a customer environment that can be an instant compliance finding.

**Production war story:** A customer's Jenkins agents suddenly failed all npm installs and AWS SDK calls after the security team rolled out SSL inspection on the egress firewall over a weekend. A contractor "fixed" CI by exporting `NODE_TLS_REJECT_UNAUTHORIZED=0` in the global Jenkins env — which also applied to the production *deploy* jobs that pushed artifacts and rotated credentials, all now happily accepting any interposed certificate, and it sat that way for five months until an audit grep found it. The correct fix took ten minutes: fetch the firewall's signing CA, bake it into the agent image, set `NODE_EXTRA_CA_CERTS`. The interview-worthy takeaway: verification-off "fixes" spread invisibly because they make errors disappear — grep for that env var and `rejectUnauthorized: false` in every codebase you inherit.

---

### Q18. Security groups vs NACLs — what does "stateful vs stateless" actually mean operationally?

**Answer:**

Both filter traffic in a VPC, at different attachment points with different semantics:

| | Security Group | Network ACL |
|---|---|---|
| Attaches to | ENI (instance/task/LB) | Subnet |
| State | **Stateful** — return traffic auto-allowed | **Stateless** — return traffic needs explicit rules |
| Rules | Allow only (implicit deny) | Allow **and deny**, evaluated by rule number, first match wins |
| Evaluation | All rules evaluated together | Ordered; lowest number matching wins |
| Can reference | Other SGs (huge — see below) | CIDRs only |

**Stateful** means the SG tracks connections: allow inbound 443 and the response packets flow out automatically, no egress rule consulted for that flow. **Stateless** means a NACL evaluates every packet independently: allow inbound 443 and you must *also* allow outbound **ephemeral ports** (1024–65535) for the responses — forgetting ephemeral ports is the classic NACL outage and the classic interview probe ("your NACL allows inbound 443, why do connections hang?" — SYN/ACK is being dropped on the way out).

The pattern that shows seniority — **SG references instead of CIDRs**:

```
alb-sg:  inbound 443 from 0.0.0.0/0
app-sg:  inbound 8080 from sg-alb (the ALB's SG, not an IP range)
db-sg:   inbound 5432 from sg-app
```

This encodes the architecture as identity-based rules that survive autoscaling, IP churn, and subnet changes. NACLs stay mostly default-allow and are used surgically: subnet-level *deny* of a hostile CIDR (SGs can't deny), coarse isolation between subnet tiers, compliance checkboxes.

**Interview trap:** "SGs have no deny rules, so how do you block one bad IP hitting your ALB?" You can't with an SG — that's exactly the NACL (or WAF) use case. Knowing which tool *can't* do something is the differentiator.

---

### Q19. Explain public vs private subnets, NAT, and how a "private" instance reaches the internet.

**Answer:**

A subnet is "public" or "private" purely by its **route table** — nothing intrinsic:

- **Public subnet:** route table has `0.0.0.0/0 → Internet Gateway (IGW)`, and instances need public IPs to use it. The IGW is a 1:1 NAT between an instance's public and private IP.
- **Private subnet:** no route to the IGW. Inbound connections from the internet are *impossible* at the routing layer — defense that doesn't depend on any SG being correct.

Outbound from private subnets goes through a **NAT gateway** that lives in a *public* subnet:

```
Internet
   │
 [IGW]
   │
Public subnet  ──  [ALB]  [NAT GW (has an Elastic IP)]
   │                          ▲
   │  (ALB forwards to)       │ 0.0.0.0/0 route from private RT
Private subnet ──  [app instances / ECS tasks]
   │
Private subnet ──  [RDS]   (no 0.0.0.0/0 route at all)
```

NAT is **one-way by construction**: it rewrites outbound source IPs to its Elastic IP and tracks connections so responses map back; unsolicited inbound has no mapping and dies. Standard three-tier layout: ALB in public, app in private (reached only via the ALB's SG), database in an isolated private subnet whose route table has no internet route whatsoever.

Operational notes worth volunteering: NAT gateways are per-AZ (one per AZ or an AZ outage cuts egress for surviving AZs routed through it) and bill per-GB processed — which sets up Q20. IPv6 uses egress-only internet gateways instead of NAT. And "private subnet" ≠ "safe": anything in the VPC can still reach it subject to SGs, and a compromised app instance still has outbound internet via NAT unless you restrict egress (egress SG rules, network firewall, or proxy allowlists — customers with compliance regimes ask for this constantly).

---

### Q20. What are VPC endpoints and when do you insist on them at a customer?

**Answer:**

By default, an EC2 instance calling S3 or Secrets Manager resolves a *public* endpoint and routes via the IGW/NAT — traffic to "internal" AWS services leaves your network path and, for private subnets, pays NAT per-GB. VPC endpoints keep it on the AWS backbone inside your VPC:

- **Gateway endpoints** (S3, DynamoDB only): a route-table entry — traffic to the service's prefix list routes to the endpoint. **Free.** There is near-zero excuse for a private subnet doing S3 traffic through NAT; it's both a security and a (often large) cost bug.
- **Interface endpoints** (PrivateLink — Secrets Manager, KMS, ECR, CloudWatch, SQS, most services, plus third-party/SaaS and your own cross-account services): an ENI with a private IP in your subnet; private DNS makes `secretsmanager.us-east-1.amazonaws.com` resolve to it. Hourly + per-GB cost, controlled by an SG like any ENI.

Why an FDE insists on them in regulated environments:

1. **True network isolation:** workloads in private subnets with *no NAT at all* can still reach S3/KMS/Secrets Manager — you can prove "this subnet cannot reach the internet, period," which auditors love.
2. **Endpoint policies:** an S3 gateway endpoint policy can say "only these buckets, only these principals" — so even exfiltration to an *attacker's own S3 bucket* (a real technique, since S3 traffic looks legitimate) is blocked at the network layer.
3. Pairs with bucket policies via `aws:sourceVpce` conditions: "this bucket only accepts requests through our endpoint" — now stolen credentials are useless from outside the VPC.
4. **Cost:** replacing NAT-GW S3 traffic with a free gateway endpoint has, on real engagements, cut four-figure monthly NAT processing bills to ~zero.

Endpoint policy sketch (attached to the endpoint, complements IAM and bucket policies):

```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::customer-prod-data/*"
  }]
}
```

**Interview trap:** "Our services talk to S3 over the internal AWS network anyway, right?" Not without an endpoint — from a private subnet it transits your NAT gateway to S3's public endpoint. Correcting this politely, with the cost number attached, is a very FDE move.

---

### Q21. How do the layers combine? Design the security posture for a service storing customer PII on AWS.

**Answer:**

The senior answer is defense in depth with *named layers* and what each one actually stops:

1. **Network:** service in private subnets; ALB in public terminating TLS 1.3; SG chain `alb-sg → app-sg → db-sg` (Q18); no NAT route for the DB tier; gateway endpoint for S3, interface endpoints for KMS/Secrets Manager (Q20). Stops: direct internet access, lateral movement, credential use from outside the VPC.
2. **Transit:** TLS 1.3 everywhere external; mTLS or mesh-issued short-lived certs service-to-service (Q4); `Early-Data` rejected on mutating routes (Q3). Stops: on-path interception and service impersonation.
3. **At rest:** RDS + S3 SSE-KMS with a customer-managed key and key policy separate from IAM admin (Q5–Q7). Stops: media/snapshot exposure; enables crypto-shredding.
4. **Field-level:** the actual PII columns (SSNs, etc.) envelope-encrypted in the app with KMS data keys, AES-256-GCM with AAD = record identity (Q6, Q11). Stops: SQL injection and over-broad DB access reading raw PII — the thing storage encryption can't do (Q1).
5. **Secrets:** no long-lived creds in env; IAM roles for AWS access; DB creds from Secrets Manager with rotation, or Vault dynamic secrets (Q8–Q10). Stops: leaked-credential persistence.
6. **Audit/detection:** CloudTrail on KMS decrypt events with encryption context, alerting on anomalous volume — the KMS choke point means every PII decrypt is a log line.

Then say the sentence interviewers wait for: *each layer assumes the previous one has already failed.* The field-level encryption exists because someday the SG is misconfigured; the endpoint policy exists because someday an IAM key leaks.

---

### Q22. Rapid-fire misconceptions — give the one-line correction.

**Answer:**

- "Base64 encrypts the payload." → Encoding, zero secrecy; anyone can decode it (Q15).
- "We hash SSNs so they're safe." → Low-entropy data is brute-forceable through any fast hash; encrypt or tokenize (Q14).
- "Set `rejectUnauthorized: false` to fix the cert error." → That disables verification entirely; fix the chain or add the CA (Q17).
- "GCM nonce reuse just weakens security a bit." → It leaks plaintext XORs *and* hands the attacker the forgery key (Q12).
- "KMS encrypts our data." → KMS wraps your *data keys*; bulk encryption is local (Q5).
- "RDS encryption protects against SQL injection." → Storage-layer encryption is invisible to queries (Q7).
- "Env vars are secure because they're not in code." → They leak via /proc, child processes, crash dumps, CI logs (Q8).
- "We rotate keys, so re-encryption happens automatically." → KMS rotation swaps backing material for *new* wraps; existing data isn't re-encrypted and DEK leaks aren't cured (Q10).
- "Our SG blocks that attacker's IP." → SGs can't deny; that's a NACL or WAF (Q18).
- "The private subnet can't be reached, so it's secure." → Anything in the VPC can reach it per SGs, and it can still exfiltrate outbound via NAT (Q19).
- "mTLS means we don't need authz." → Identity ≠ permission; authorize the presented identity (Q4).
- "Forward secrecy protects us if the session key leaks." → It protects *past* sessions if the *long-term* key leaks (Q2).

If you can deliver each correction with the mechanism behind it — not just the slogan — you're operating at the level this file is preparing you for.

---

## Quick-reference: what to reach for

| Need | Reach for |
|---|---|
| Confidentiality + integrity of app data | AES-256-GCM via `node:crypto`, random 12-byte IV, AAD, KMS data keys |
| Bulk data at rest in AWS | SSE-KMS (S3, with Bucket Keys), storage-level encryption (RDS/EBS) + field-level for PII |
| Trust a webhook/token | HMAC-SHA256 + `timingSafeEqual`, or a vetted JWT/PASETO library |
| Store passwords | argon2id (or scrypt/bcrypt) — never a fast hash |
| Service-to-service identity | mTLS with short-lived certs (Vault PKI / mesh) |
| Secrets at runtime | Secrets Manager / Vault fetched via platform identity; TTL cache; dynamic secrets where possible |
| AWS API traffic from private subnets | Gateway endpoint (S3/DynamoDB, free) or interface endpoints + endpoint policies |
| Block a hostile CIDR at the subnet | NACL deny rule (SGs can't deny) |
