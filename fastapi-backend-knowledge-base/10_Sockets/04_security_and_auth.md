# 04. Security & Authentication: Locking it Down

## 1. The "No Header" Problem

In HTTP, we send `Authorization: Bearer <token>`. In the JavaScript `WebSocket` API, you cannot set custom headers.

```javascript
// This throws an error: WebSocket API doesn't support custom headers.
const ws = new WebSocket("ws://api.com", { headers: { "Authorization": "..." } });
```

So how do we authenticate? Use query parameters, ticket pattern, or protocol-level auth.

---

## 2. Strategy A: Query Parameters (The Standard)

Pass the token in the URL: `ws://api.example.com/ws?token=eyJhbGciOiJIUz...`

**The Risk:** URLs are often logged in server access logs (Nginx, AWS ALB). Your tokens might be visible to sysadmins.

**The Mitigation:** Use short-lived tokens and configure logs to mask the `token` parameter.

```python
from fastapi import WebSocket, Query, status

# Query parameter authentication: Token passed in URL query string.
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # Verify token: Validate JWT or session token.
    user = verify_token(token)
    if not user:
        # Close with Policy Violation (1008): Invalid token, reject connection.
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await websocket.accept()  # Accept connection after authentication
    # ...
```

---

## 3. Strategy B: The Ticket Pattern (The Fort Knox)

If you are paranoid about URL logging, use the ticket pattern: **Client** sends standard HTTP POST to `/auth/ticket` with Bearer Token. **Server** validates token, generates a `ticket_uuid`, stores it in Redis with 10-second TTL. **Server** returns `ticket_uuid`. **Client** connects `ws://api.com/ws?ticket=ticket_uuid`. **Server** checks Redis. If valid, deletes ticket (one-time use) and accepts.

---

## 4. Strategy C: Protocol-Level Auth

Connect first, authenticate second: **Client** connects. **Server** accepts (but marks connection as "Unauthenticated"). **Client** sends `{"type": "auth", "token": "..."}`. **Server** validates. If fail, close connection.

**Pros:** No URL logging. **Cons:** You accept a TCP connection from anyone. Easy to DDoS.

**Verdict:** Use Strategy A (query parameters) for most apps. Use Strategy B (ticket pattern) for banking/healthcare.

---

## 5. WSS (TLS/SSL) is Mandatory

Never use `ws://` in production. Always use `wss://`. **Encryption** prevents Man-in-the-Middle attacks. **Firewalls:** Corporate firewalls often block non-standard traffic on port 80. But they trust encrypted traffic on port 443. `wss://` passes through firewalls much better than `ws://`.

---

## 6. Cross-Origin Resource Sharing (CORS)

WebSockets do not follow the Same-Origin Policy. A malicious site can connect to your localhost WebSocket!

**FastAPI Protection:** FastAPI does NOT check origin by default for WebSockets. You must check it manually or use a middleware.

```python
# Origin validation: Prevent cross-origin WebSocket connections.
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Check origin: Validate that connection comes from allowed domains.
    origin = websocket.headers.get("origin")
    if origin not in ["https://myapp.com", "https://www.myapp.com"]:
        # Reject unauthorized origin: Close with policy violation.
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await websocket.accept()  # Accept only if origin is valid
```