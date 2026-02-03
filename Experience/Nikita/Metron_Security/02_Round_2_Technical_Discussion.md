# Round 2: Technical Discussion (1 Hour)

This round is with an **Engineering Manager (EM)**. It's less about "Can you code?" and more about **"How do you think?"**.

## 🏗️ System Design & Integrations (The "Meat" of the Interview)
Metron helps tools *talk* to each other. You need to sound like an expert in **Inter-operability**.

### 1. Polling vs. Webhooks
*Be ready to explain when to use which.*
- **Polling:** "We hit the IBM QRadar API every 5 minutes." (Good for legacy tools, but heavy on resources).
- **Webhooks:** "CrowdStrike sends us an event immediately when an alert triggers." (Real-time, efficient).

### 2. Handling Data Mismatch (Normalization)
- "If Splunk calls a field `src_ip` and ServiceNow calls it `source_address`, how do you map them?"
- **Answer:** Mention building a **Middleware** or a **Translation Layer** that uses a standard schema (like Common Information Model - CIM).

### 3. Authentication Patterns
- Be ready to discuss **OAuth2**, **API Keys**, and **Personal Access Tokens (PAT)**.
- **Security Hint:** Never store these in plain text; use Secret Managers or Encrypted Envs.

---

## 🛡️ Security Best Practices (Must-Know)
Since it's a security company, drop these terms:
- **Least Privilege:** Giving an API key only the permissions it needs.
- **OWASP Top 10:** Specifically **Injection** (SQL/Command) and **Broken Access Control**.
- **Data Encryption:** Using HTTPS/TLS for data in transit.

---

## 🔄 SDLC & Agile Methodologies
*Metron works in Agile teams. Show them you understand the "Process".*
- **Agile Scrum:** "I'm comfortable with Sprints, Daily Standups, and Retrospectives. I value incremental delivery."
- **Design Chats:** "I believe in discussing architecture *before* coding to avoid technical debt."
- **CI/CD Pipelines:** "I understand how code moves from Development → Staging → Production using tools like GitHub Actions or Jenkins."
- **Code Reviews:** "I see code reviews as a way to maintain quality and share knowledge within the team."

---

## 🏗️ Software Design Patterns (OOP Focus)
*Drop these terms during the technical architecture chat.*
- **Factory Pattern:** "Using a Factory to create different integration objects (Splunk vs QRadar) based on user config."
- **Observer Pattern:** "Perfect for real-time alerts—notifying multiple handlers when a security event occurs."
- **Strategy Pattern:** "Switching between different data normalization strategies at runtime."
- **Singleton:** "Ensuring there's only one instance of the Database or Logger throughout the app."

---

## 🎙️ Questions to Ask the EM
*Show that you are "Product-Minded".*
1. "How do you handle breaking changes in third-party APIs (like when ServiceNow updates their version)?"
2. "What is the most challenging integration the team has built recently?"
3. "As a developer-first company, how does Metron balance 'Fast Shipping' with 'Security Rigor'?"

---

## 👔 Behavioral Checklist
- **Ownership:** Tell a story about a bug you found and fixed end-to-end.
- **Collaboration:** How do you work with customers who give vague requirements?
- **Learning:** Mention a new tech (like FastAPI or NestJS) you learned recently.
