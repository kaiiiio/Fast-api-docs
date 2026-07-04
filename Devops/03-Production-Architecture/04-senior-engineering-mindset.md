# Production Mindset & Senior Engineering

## Key Terms

* **Ownership** (care after deployment): engineer is responsible for production behavior.
* **Blast radius** (damage size): how much system/users are affected by a failure.
* **Root cause** (real underlying reason): not just the visible symptom.
* **Postmortem** (incident learning document): what happened, why, and prevention steps.
* **Runbook** (step-by-step ops guide): how to handle known incidents.
* **SLO** (service level objective): target reliability, like 99.9% success.
* **SLA** (service level agreement): customer-facing reliability promise.
* **SLI** (service level indicator): metric used to measure reliability.
* **Error budget** (allowed failure amount): how much unreliability is acceptable.
* **Tech debt** (future cost of shortcuts): code/system choices that slow later work.
* **Toil** (manual repetitive ops work): should be automated over time.
* **Tradeoff** (choose one benefit over another): cost vs speed, simplicity vs flexibility.

---

## The Mindset Shift

### Junior Developer
> "My code works on my machine"

### Senior Engineer
> "My system survives failures in production"

---

## What Makes You Senior

### 1. You Prevent Outages

**Junior**: Fixes bugs after they happen
**Senior**: Designs systems that prevent bugs

```javascript
// Junior
async function fetchUser(id) {
  return await db.query('SELECT * FROM users WHERE id = ?', [id]);
}

// Senior
async function fetchUser(id) {
  // Input validation
  if (!id || typeof id !== 'number') {
    throw new Error('Invalid user ID');
  }
  
  // Retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      // Timeout
      const result = await Promise.race([
        db.query('SELECT * FROM users WHERE id = ?', [id]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      // Cache
      await cache.set(`user:${id}`, result, 300);
      return result;
      
    } catch (error) {
      retries--;
      if (retries === 0) {
        // Log and alert
        logger.error('Failed to fetch user', { id, error });
        throw error;
      }
      await sleep(1000);
    }
  }
}
```

---

### 2. You Design for Failure

**Assume everything will fail**:
* Network will drop
* Database will timeout
* Service will crash
* Disk will fill up

**Design accordingly**:
```javascript
// Graceful degradation
async function getRecommendations(userId) {
  try {
    return await mlService.getRecommendations(userId);
  } catch (error) {
    logger.warn('ML service down, using fallback', { userId, error });
    // Fallback to simple algorithm
    return await getPopularItems();
  }
}
```

---

### 3. You Think Async

**Synchronous (blocks user)**:
```javascript
app.post('/order', async (req, res) => {
  const order = await createOrder(req.body);
  await sendEmail(order);           // User waits
  await updateInventory(order);     // User waits
  await notifyWarehouse(order);     // User waits
  res.send({ orderId: order.id });  // Finally!
});
```

**Asynchronous (instant response)**:
```javascript
app.post('/order', async (req, res) => {
  const order = await createOrder(req.body);
  
  // Queue background tasks
  await queue.add('send-email', { orderId: order.id });
  await queue.add('update-inventory', { orderId: order.id });
  await queue.add('notify-warehouse', { orderId: order.id });
  
  res.send({ orderId: order.id });  // Instant!
});
```

---

### 4. You Care About Cost

**Junior**: "Let's use the biggest server"
**Senior**: "Let's optimize and scale horizontally"

```javascript
// Expensive: Process everything
app.get('/analytics', async (req, res) => {
  const data = await db.query('SELECT * FROM events');  // 10M rows
  const analytics = processData(data);
  res.send(analytics);
});

// Efficient: Use aggregation
app.get('/analytics', async (req, res) => {
  // Pre-computed in background job
  const analytics = await cache.get('analytics');
  res.send(analytics);
});
```

---

### 5. You Own Production

**Junior**: "I pushed the code, QA will test it"
**Senior**: "I deployed it, I'm monitoring it, I'll fix it if it breaks"

**Ownership includes**:
* Writing tests
* Monitoring metrics
* Setting up alerts
* On-call rotation
* Post-mortems

---

## Senior Engineering Principles

### 1. Simplicity Over Cleverness

```javascript
// Clever (hard to maintain)
const users = data.reduce((acc, x) => 
  x.age > 18 ? [...acc, { ...x, adult: true }] : acc, []);

// Simple (easy to understand)
const users = data
  .filter(user => user.age > 18)
  .map(user => ({ ...user, adult: true }));
```

---

### 2. Observability from Day 1

```javascript
// No observability
async function processPayment(orderId) {
  const payment = await stripe.charge(orderId);
  return payment;
}

// Full observability
async function processPayment(orderId) {
  const start = Date.now();
  
  logger.info('Processing payment', { orderId });
  metrics.increment('payment.attempts');
  
  try {
    const payment = await stripe.charge(orderId);
    
    metrics.increment('payment.success');
    metrics.histogram('payment.duration', Date.now() - start);
    logger.info('Payment successful', { orderId, paymentId: payment.id });
    
    return payment;
  } catch (error) {
    metrics.increment('payment.failure');
    logger.error('Payment failed', { orderId, error });
    throw error;
  }
}
```

---

### 3. Fail Fast

```javascript
// Fail slow (wastes resources)
async function createUser(data) {
  const user = await db.insert(data);
  
  // Validation after DB insert!
  if (!data.email.includes('@')) {
    throw new Error('Invalid email');
  }
  
  return user;
}

// Fail fast
async function createUser(data) {
  // Validate first
  if (!data.email.includes('@')) {
    throw new Error('Invalid email');
  }
  
  const user = await db.insert(data);
  return user;
}
```

---

### 4. Idempotency

**Idempotent**: Same operation can be repeated safely

```javascript
// Not idempotent
async function addCredits(userId, amount) {
  const user = await getUser(userId);
  user.credits += amount;  // Called twice = double credits!
  await saveUser(user);
}

// Idempotent
async function addCredits(userId, amount, transactionId) {
  // Check if already processed
  const exists = await db.query(
    'SELECT 1 FROM transactions WHERE id = ?',
    [transactionId]
  );
  
  if (exists) {
    return;  // Already processed
  }
  
  await db.transaction(async (trx) => {
    await trx.query(
      'UPDATE users SET credits = credits + ? WHERE id = ?',
      [amount, userId]
    );
    await trx.query(
      'INSERT INTO transactions (id, user_id, amount) VALUES (?, ?, ?)',
      [transactionId, userId, amount]
    );
  });
}
```

---

### 5. Backpressure

**Don't accept more work than you can handle**

```javascript
// No backpressure (system crashes)
app.post('/process', async (req, res) => {
  await queue.add('heavy-task', req.body);  // Queue grows infinitely
  res.send('OK');
});

// With backpressure
app.post('/process', async (req, res) => {
  const queueSize = await queue.count();
  
  if (queueSize > 10000) {
    return res.status(503).send({
      error: 'System overloaded, try again later'
    });
  }
  
  await queue.add('heavy-task', req.body);
  res.send('OK');
});
```

---

## Production Checklist

### Before Deployment
- [ ] Code reviewed
- [ ] Tests passing (unit, integration, e2e)
- [ ] Performance tested
- [ ] Security scanned
- [ ] Database migrations tested
- [ ] Rollback plan ready
- [ ] Monitoring in place
- [ ] Alerts configured

### After Deployment
- [ ] Health checks passing
- [ ] Metrics normal
- [ ] Error rate normal
- [ ] Response time normal
- [ ] No increase in alerts
- [ ] Logs reviewed

---

## Incident Response

### 1. Detect
* Alerts fire
* Monitoring shows anomaly
* User reports

### 2. Respond
* Acknowledge alert
* Assess severity
* Communicate to team

### 3. Mitigate
* Rollback if possible
* Apply hotfix
* Scale resources

### 4. Resolve
* Fix root cause
* Deploy fix
* Verify resolution

### 5. Learn
* Write post-mortem
* Identify improvements
* Implement safeguards

---

## Post-Mortem Template

```markdown
# Incident: [Title]

## Summary
Brief description of what happened

## Impact
- Duration: X hours
- Users affected: Y
- Revenue impact: $Z

## Timeline
- 10:00 - Incident started
- 10:05 - Alert fired
- 10:10 - Team notified
- 10:30 - Root cause identified
- 11:00 - Fix deployed
- 11:15 - Incident resolved

## Root Cause
What actually caused the issue

## Resolution
How it was fixed

## Action Items
- [ ] Add monitoring for X
- [ ] Implement retry logic
- [ ] Update runbook

## Lessons Learned
What we learned and how to prevent in future
```

---

## Interview Questions

**Q: What's the difference between a junior and senior engineer?**
A: Juniors focus on making code work. Seniors focus on making systems reliable, scalable, and maintainable.

**Q: How do you handle a production outage?**
A: Detect → Respond → Mitigate → Resolve → Learn. Always write post-mortems.

**Q: What is idempotency and why is it important?**
A: An operation that can be repeated safely. Critical for retries and distributed systems.

**Q: How do you ensure code quality?**
A: Tests, code reviews, linting, CI/CD, monitoring, and ownership.

---

## Career Progression

### Junior (0-2 years)
* Focus: Make code work
* Scope: Features
* Mindset: "How do I implement this?"

### Mid-level (2-5 years)
* Focus: Make code maintainable
* Scope: Components
* Mindset: "How do I design this well?"

### Senior (5+ years)
* Focus: Make systems reliable
* Scope: Systems
* Mindset: "How do I prevent failures?"

### Staff/Principal (8+ years)
* Focus: Make organization effective
* Scope: Multiple systems
* Mindset: "How do we scale the team?"

---

## Summary

**Senior engineers**:
* Design for failure
* Think async
* Own production
* Care about cost
* Prevent outages
* Write maintainable code
* Mentor others

**Key Insight**: Senior is not about years of experience, it's about mindset and ownership.

---

## Recommended Reading

* **Site Reliability Engineering** (Google)
* **Designing Data-Intensive Applications** (Martin Kleppmann)
* **The Phoenix Project** (Gene Kim)
* **Release It!** (Michael Nygard)
* **Accelerate** (Nicole Forsgren)
