# Security & Authentication in Node.js

Securing a Node.js application requires a multi-layered approach covering code, dependencies, and deployment environment.

## 1. Authentication Patterns
- **JWT (JSON Web Tokens)**: Stateless authentication. Best for distributed systems.
- **Sessions & Cookies**: Stateful authentication. Best for traditional web apps.
- **OUATH2 / OIDC**: Delegated authentication (Login with Google/GitHub).

### JWT Best Practices
```javascript
const jwt = require('jsonwebtoken');

// Generate Token
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Verify Token (Middleware)
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
```

---

## 2. Input Validation & Sanitization
Never trust user input.
- **Joi / Zod**: Schema validation for `req.body` and `req.query`.
- **Sanitizer**: Use libraries to escape HTML/JS in user-provided strings to prevent XSS.

---

## 3. Top Security Risks (OWASP Top 10)
1. **Injection (SQL/NoSQL)**: Always use parameterized queries (ORMs) to prevent injection.
2. **XSS (Cross-Site Scripting)**: Sanitize output and use **Helmet.js** to set security headers.
3. **CSRF (Cross-Site Request Forgery)**: Use CSRF tokens for stateful applications.
4. **Brute Force**: Implementation **Rate Limiting** (e.g., `express-rate-limit`).

---

## 4. Helpful Security Packages
- **Helmet**: Sets secure HTTP headers (HSTS, CSP, etc.).
- **bcrypt**: For hashing passwords before saving to DB.
- **csurf**: CSRF protection middleware.
- **cors**: Manage Cross-Origin Resource Sharing.

---

## 5. Security Checklist
- [ ] Use `npm audit` to check for vulnerable dependencies.
- [ ] Store secrets in `.env` (never commit them to Git).
- [ ] Use `secure: true` and `httpOnly: true` for cookies.
- [ ] Implement a strong Content Security Policy (CSP).
- [ ] Limit request payload sizes to prevent DoS attacks.
- [ ] Always use HTTPS in production.
