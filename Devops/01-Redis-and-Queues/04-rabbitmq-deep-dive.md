# RabbitMQ — Deep Dive

## What RabbitMQ Is

RabbitMQ is a **message broker implementing AMQP** (Advanced Message Queuing Protocol).

It supports:

* Routing
* Acknowledgements
* Retries
* Dead-letter queues
* Multiple protocols (AMQP, MQTT, STOMP)

Plain-English definition:

> RabbitMQ is a dedicated message broker. Producers send messages to RabbitMQ, RabbitMQ routes those messages using exchanges and bindings, and consumers process messages from queues with acknowledgments.

RabbitMQ exists for service-to-service communication where routing and delivery control matter more than simple background job convenience.

---

## RabbitMQ Architecture

```
Producer → Exchange → Queue → Consumer
```

### Key Components

1. **Producer**: Sends messages
2. **Exchange**: Routes messages to queues
3. **Queue**: Stores messages
4. **Consumer**: Receives messages
5. **Binding**: Links exchange to queue

### RabbitMQ Component Meanings

* **Producer** (message sender): service that publishes messages.
* **Exchange** (message router): decides which queue(s) should receive a message.
* **Queue** (message storage): waits until a consumer processes the message.
* **Consumer** (message processor): service that reads and handles messages.
* **Binding** (routing rule): connects exchange to queue.

Mental model:

```txt
Producer -> Exchange (router) -> Queue (waiting line) -> Consumer
```

---

## Exchange Types

### 1. Direct Exchange
Routes to queue with exact routing key match

```
Producer --[routing_key: "error"]--> Exchange --> Queue (binding: "error")
```

**Use Case**: Log levels (info, warning, error)

### 2. Fanout Exchange
Broadcasts to ALL bound queues (ignores routing key)

```
Producer --> Exchange --> Queue 1
                      --> Queue 2
                      --> Queue 3
```

**Use Case**: Notifications to multiple services

### 3. Topic Exchange
Routes based on pattern matching

```
Producer --[routing_key: "user.created"]--> Exchange --> Queue (pattern: "user.*")
```

**Use Case**: Event-driven architecture

### 4. Headers Exchange
Routes based on message headers (rarely used)

---

## RabbitMQ Concepts in Depth

* **Routing key** (message label): used by exchanges to decide routing, like `order.created`.
* **Durable queue** (queue survives restart): queue definition remains after RabbitMQ restarts.
* **Persistent message** (message saved to disk): important messages can survive broker restart.
* **Manual ack** (consumer confirms success): RabbitMQ removes message only after consumer confirms.
* **Nack** (consumer reports failure): message can be requeued or dead-lettered.
* **Prefetch** (unacked message limit): prevents one slow consumer from grabbing too much work.
* **Publisher confirm** (broker accepted message): producer knows RabbitMQ received the message.
* **DLX** (dead letter exchange): routes failed/expired/rejected messages.
* **DLQ** (dead letter queue): stores failed messages for debugging/replay.
* **Poison message** (always-failing message): should go to DLQ after limited retries.
* **Idempotent consumer** (safe if message repeats): prevents duplicate refunds, emails, or stock updates.

Example:

```txt
order.paid with eventId=evt_123
Consumer checks if evt_123 was already handled.
If yes, skip duplicate work.
```

---

## RabbitMQ vs BullMQ

| Feature          | BullMQ      | RabbitMQ     |
| ---------------- | ----------- | ------------ |
| Complexity       | Low         | Medium       |
| Redis dependency | Yes         | No           |
| Ordering         | Good        | Good         |
| Scale            | Medium      | High         |
| Routing          | Simple      | Advanced     |
| Multi-language   | Node.js     | Any          |
| Message patterns | Work queue  | Pub/Sub, RPC |

### Detailed Decision Guide

Use **BullMQ** when you are mostly asking:

* "How do I run this slow task later?"
* "How do I retry this email/webhook/PDF job?"
* "How do I schedule jobs in Node.js?"
* "How do I track job progress?"

Use **RabbitMQ** when you are mostly asking:

* "How do multiple services communicate reliably?"
* "How do I route one event to different services?"
* "How do I support services written in Node.js, Python, Java, Go, etc.?"
* "How do I build event-driven workflows without direct service calls?"

Example:

```txt
BullMQ:
API -> Redis queue -> Email worker

RabbitMQ:
Order Service -> Exchange
  -> Payment queue
  -> Inventory queue
  -> Email queue
  -> Analytics queue
```

In short:

* BullMQ is excellent for **jobs**.
* RabbitMQ is excellent for **messages between services**.

---

## When to Use RabbitMQ

✅ Microservices communication
✅ Multi-language systems
✅ Complex routing requirements
✅ Need for message acknowledgments
✅ High reliability requirements
✅ Event-driven architecture

❌ Simple background jobs (use BullMQ)
❌ Event streaming/replay (use Kafka)
❌ Only Node.js (BullMQ is simpler)

---

## Code Examples

### Producer (Node.js)

```ts
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

const exchange = 'logs';
await channel.assertExchange(exchange, 'fanout', { durable: false });

const message = 'Hello World';
channel.publish(exchange, '', Buffer.from(message));

console.log('Sent:', message);
```

### Consumer (Node.js)

```ts
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

const exchange = 'logs';
await channel.assertExchange(exchange, 'fanout', { durable: false });

const q = await channel.assertQueue('', { exclusive: true });
await channel.bindQueue(q.queue, exchange, '');

console.log('Waiting for messages...');

channel.consume(q.queue, (msg) => {
  if (msg) {
    console.log('Received:', msg.content.toString());
    channel.ack(msg); // Acknowledge message
  }
}, { noAck: false });
```

---

## Message Acknowledgments

### Manual Ack (Recommended for Production)

```ts
channel.consume(queue, (msg) => {
  try {
    processMessage(msg);
    channel.ack(msg); // Success
  } catch (error) {
    channel.nack(msg, false, true); // Requeue on failure
  }
}, { noAck: false });
```

### Auto Ack (Risky)

```ts
channel.consume(queue, (msg) => {
  processMessage(msg);
}, { noAck: true }); // Message lost if processing fails
```

---

## Dead Letter Exchanges (DLX)

Handle failed messages:

```ts
await channel.assertQueue('main-queue', {
  deadLetterExchange: 'dlx-exchange',
  messageTtl: 60000 // 60 seconds
});

await channel.assertQueue('dead-letter-queue');
await channel.bindQueue('dead-letter-queue', 'dlx-exchange', '');
```

---

## Interview Questions

**Q: What is the difference between RabbitMQ and Kafka?**
A: RabbitMQ is a message broker (queue-based, message deleted after consumption). Kafka is an event log (stream-based, messages retained for replay).

**Q: How does RabbitMQ ensure message delivery?**
A: Through acknowledgments, persistence, and publisher confirms. Messages are only removed after consumer acknowledges.

**Q: When would you choose RabbitMQ over BullMQ?**
A: When you need complex routing, multi-language support, or don't want Redis dependency.

**Q: What does an exchange do in RabbitMQ?**
A: An exchange routes messages to queues. It lets producers publish one message without knowing exactly which services will receive it.

**Q: What does prefetch help with?**
A: Prefetch controls how many unacknowledged messages a consumer can hold. It prevents slow consumers from being overloaded and improves fair message distribution.

**Q: Why do RabbitMQ consumers need to be idempotent?**
A: A message can be delivered again if a consumer crashes before ack. Idempotency prevents duplicate side effects like sending the same refund, email, or inventory update twice.

---

## Production Best Practices

✅ Enable message persistence
✅ Use manual acknowledgments
✅ Implement dead letter queues
✅ Set up clustering for HA
✅ Monitor queue length
✅ Use prefetch count to control load

```ts
// Prefetch: only get 1 message at a time
channel.prefetch(1);
```

✅ Implement retry with exponential backoff
✅ Use durable queues and exchanges

```ts
await channel.assertQueue('tasks', { durable: true });
await channel.assertExchange('events', 'topic', { durable: true });
```

---

## Common Patterns

### 1. Work Queue (Task Distribution)
```
Producer → Queue → Worker 1
                 → Worker 2
```

### 2. Pub/Sub (Fanout)
```
Publisher → Exchange → Subscriber 1
                    → Subscriber 2
```

### 3. RPC (Request/Reply)
```
Client → Request Queue → Server
      ← Reply Queue   ←
```

### 4. Event Bus (Topic Exchange)
```
Service A → Exchange → Service B (user.*)
                    → Service C (order.*)
```
