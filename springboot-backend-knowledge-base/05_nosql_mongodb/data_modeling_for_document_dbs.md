# Data Modeling for Document DBs (MongoDB)

## 1. Embed vs Reference

The #1 question in NoSQL: **Should I nest the data or link it?**

### Embedding (The Default)
Put the `Address` *inside* the `User` document.

```json
{
  "_id": 1,
  "name": "Alice",
  "address": {
    "street": "123 Main St",
    "city": "NY"
  }
}
```
- **Pros**: One query to get everything. Fast. Atomic updates.
- **Cons**: Duplication. If Alice changes address, you update one doc. But if `Department` is embedded in `User` and the Department name changes, you update 10,000 users.

### Referencing (The SQL Way)
Store `departmentId` in `User`.

```json
{ "_id": 1, "name": "Alice", "departmentId": 99 }
```
- **Pros**: Normalized. Small documents.
- **Cons**: Requires `$lookup` (Join) or 2 queries. Slower.

### The Rule of Thumb
- **One-to-Few**: Embed. (User -> Addresses).
- **One-to-Many**: Embed (if bounded). (Post -> Comments).
- **One-to-Squillions**: Reference. (Logs -> System).
- **Many-to-Many**: Reference. (Students -> Courses).

---

## 2. Schema Design Patterns

### The Bucket Pattern (IoT)
Don't store 1 document per sensor reading (1 billion docs).
Store 1 document per *hour*, with an array of readings.

```json
{
  "sensorId": 1,
  "date": "2023-10-27",
  "hour": 10,
  "readings": [
    { "ts": 1001, "temp": 22.5 },
    { "ts": 1002, "temp": 22.6 }
  ]
}
```
**Benefit**: Drastically reduces index size and storage.

### The Computed Pattern
Don't calculate `totalSpent` every time you read a user.
Update a `totalSpent` field every time you add an Order.
**Read Heavy vs Write Heavy**: MongoDB favors Read Heavy optimizations.
