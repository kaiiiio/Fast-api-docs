# Event Sourcing vs CRUD: Complete Comparison Guide

Event Sourcing stores changes as a sequence of events rather than updating state. This comprehensive guide explains when to use Event Sourcing versus traditional CRUD, with detailed examples and trade-offs.

## Understanding CRUD (Traditional Approach)

**What is CRUD?**
Create, Read, Update, Delete - the traditional approach to data management.

**How CRUD works:**
```
State-Based Storage:
    ┌─────────────┐
    │  Current    │
    │   State     │  ← Only current state is stored
    └─────────────┘

Operations:
    Create → INSERT INTO users (name, email) VALUES (...)
    Read   → SELECT * FROM users WHERE id = 1
    Update → UPDATE users SET email = 'new@example.com' WHERE id = 1
    Delete → DELETE FROM users WHERE id = 1
```

**Key characteristics:**
- Stores current state only
- Updates overwrite previous state
- History is lost (unless explicitly tracked)
- Simple and familiar pattern

### CRUD Example

```python
# Traditional CRUD approach
class UserRepository:
    async def create_user(self, user_data: dict) -> User:
        """Create user - stores current state."""
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            status="active"
        )
        db.add(user)
        await db.commit()
        return user
    
    async def update_user(self, user_id: int, updates: dict) -> User:
        """Update user - overwrites previous state."""
        user = await db.get(User, user_id)
        user.email = updates.get("email", user.email)
        user.name = updates.get("name", user.name)
        await db.commit()
        return user
    
    async def get_user(self, user_id: int) -> User:
        """Get user - returns current state."""
        return await db.get(User, user_id)
```

**Database schema (CRUD):**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    status VARCHAR(20),
    updated_at TIMESTAMP
    -- Only current state stored
);
```

## Understanding Event Sourcing

**What is Event Sourcing?**
Store all changes as a sequence of events. Reconstruct current state by replaying events.

**How Event Sourcing works:**
```
Event-Based Storage:
    ┌─────────────┐
    │   Event 1   │  UserCreatedEvent(name, email)
    ├─────────────┤
    │   Event 2   │  UserEmailChangedEvent(new_email)
    ├─────────────┤
    │   Event 3   │  UserStatusChangedEvent(active)
    └─────────────┘
        ↓ Replay
    ┌─────────────┐
    │  Current    │  Current state = sum of all events
    │   State     │
    └─────────────┘
```

**Key characteristics:**
- Stores all events (changes)
- Rebuilds state by replaying events
- Complete audit trail
- Time-travel capability

### Event Sourcing Example

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List

# Events
@dataclass
class UserCreatedEvent:
    user_id: str
    name: str
    email: str
    timestamp: datetime

@dataclass
class UserEmailChangedEvent:
    user_id: str
    old_email: str
    new_email: str
    timestamp: datetime

@dataclass
class UserStatusChangedEvent:
    user_id: str
    old_status: str
    new_status: str
    timestamp: datetime

# Event Store
class EventStore:
    """Store and retrieve events."""
    
    async def append_event(self, event: dict):
        """Append event to store."""
        db.execute(
            "INSERT INTO events (stream_id, event_type, event_data, version) VALUES (?, ?, ?, ?)",
            (event["stream_id"], event["type"], json.dumps(event["data"]), event["version"])
        )
        await db.commit()
    
    async def get_events(self, stream_id: str) -> List[dict]:
        """Get all events for a stream."""
        result = await db.execute(
            "SELECT event_type, event_data, version FROM events WHERE stream_id = ? ORDER BY version",
            (stream_id,)
        )
        return result.fetchall()

# Aggregate Root
class User:
    """User aggregate - state built from events."""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.name = None
        self.email = None
        self.status = None
        self.version = 0
    
    def apply_event(self, event: dict):
        """Apply event to rebuild state."""
        event_type = event["event_type"]
        event_data = json.loads(event["event_data"])
        
        if event_type == "UserCreatedEvent":
            self.name = event_data["name"]
            self.email = event_data["email"]
            self.status = "active"
        elif event_type == "UserEmailChangedEvent":
            self.email = event_data["new_email"]
        elif event_type == "UserStatusChangedEvent":
            self.status = event_data["new_status"]
        
        self.version = event["version"]
    
    @classmethod
    async def from_events(cls, user_id: str, events: List[dict]) -> "User":
        """Rebuild user from events."""
        user = cls(user_id)
        for event in events:
            user.apply_event(event)
        return user

# Repository
class UserEventSourcingRepository:
    """Event-sourced user repository."""
    
    def __init__(self, event_store: EventStore):
        self.event_store = event_store
    
    async def create_user(self, user_data: dict) -> User:
        """Create user - store event."""
        user_id = str(uuid.uuid4())
        
        event = {
            "stream_id": user_id,
            "type": "UserCreatedEvent",
            "data": {
                "name": user_data["name"],
                "email": user_data["email"]
            },
            "version": 1
        }
        
        await self.event_store.append_event(event)
        
        # Return user built from events
        user = User(user_id)
        user.apply_event(event)
        return user
    
    async def change_email(self, user_id: str, new_email: str):
        """Change email - store event."""
        # Get current state
        events = await self.event_store.get_events(user_id)
        user = await User.from_events(user_id, events)
        
        event = {
            "stream_id": user_id,
            "type": "UserEmailChangedEvent",
            "data": {
                "old_email": user.email,
                "new_email": new_email
            },
            "version": user.version + 1
        }
        
        await self.event_store.append_event(event)
    
    async def get_user(self, user_id: str) -> User:
        """Get user - rebuild from events."""
        events = await self.event_store.get_events(user_id)
        return await User.from_events(user_id, events)
```

**Database schema (Event Sourcing):**
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    stream_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    UNIQUE(stream_id, version)
);

CREATE INDEX idx_events_stream ON events(stream_id, version);
```

## When to Use Event Sourcing

### ✅ Use Event Sourcing When:

**1. Audit Trail is Critical**
- Financial systems (regulatory requirements)
- Legal/compliance systems
- Healthcare records (HIPAA compliance)

**2. Need to Reconstruct State**
- Debugging: "What was the state at 3pm yesterday?"
- Time-travel debugging
- Replay events for testing

**3. Complex State Machines**
- Order processing workflows
- Multi-step approval processes
- State transitions with history

**4. Event Replay Required**
- Rebuild projections
- Replay events to different systems
- Event-driven architecture

**5. Temporal Queries**
- "Show me all changes to this account in the last month"
- Historical analysis
- Reporting on state changes over time

### ❌ Don't Use Event Sourcing When:

**1. Simple CRUD Operations**
- Basic user management
- Simple data entry
- No audit requirements

**2. High Performance Requirements**
- Low-latency reads (replaying events is slower)
- Simple queries (current state is faster)

**3. No Audit Requirements**
- Internal tools
- Non-critical data
- Temporary data

**4. Team Unfamiliar with Pattern**
- Steep learning curve
- More complex than needed
- Increased development time

**5. Simple Domain**
- No complex business rules
- No need for event replay
- Standard CRUD is sufficient

## Comparison: CRUD vs Event Sourcing

### Performance

**CRUD:**
- ✅ Fast reads (direct state access)
- ✅ Fast writes (single update)
- ✅ Simple queries

**Event Sourcing:**
- ⚠️ Slower reads (replay events)
- ✅ Fast writes (append only)
- ⚠️ Complex queries (need projections)

### Storage

**CRUD:**
- ✅ Compact (only current state)
- ✅ Efficient storage

**Event Sourcing:**
- ⚠️ Larger storage (all events)
- ✅ Append-only (simple writes)

### Complexity

**CRUD:**
- ✅ Simple, familiar
- ✅ Easy to understand
- ✅ Standard pattern

**Event Sourcing:**
- ⚠️ More complex
- ⚠️ Steeper learning curve
- ⚠️ Requires event store infrastructure

### Audit Trail

**CRUD:**
- ❌ No automatic audit trail
- ❌ Must add separately if needed

**Event Sourcing:**
- ✅ Complete audit trail
- ✅ All changes preserved
- ✅ Time-travel capability

### Scalability

**CRUD:**
- ✅ Vertical scaling
- ⚠️ Update conflicts
- ⚠️ Lock contention

**Event Sourcing:**
- ✅ Horizontal scaling (append-only)
- ✅ No update conflicts
- ✅ Eventual consistency

## Hybrid Approach

**Use both patterns:**
- Event Sourcing for critical entities (orders, payments)
- CRUD for simple entities (user preferences, settings)

```python
# Critical: Use Event Sourcing
class OrderService:
    """Order service uses event sourcing."""
    async def create_order(self, order_data: dict):
        # Event-sourced order
        pass

# Simple: Use CRUD
class UserPreferencesService:
    """User preferences use CRUD."""
    async def update_preferences(self, user_id: int, preferences: dict):
        # Simple CRUD update
        user = await db.get(User, user_id)
        user.preferences = preferences
        await db.commit()
```

## Snapshot Strategy (Optimization)

**Problem:** Replaying all events is slow for old aggregates.

**Solution:** Periodically save snapshots.

```python
class UserSnapshot:
    """Snapshot of user state at a point in time."""
    user_id: str
    name: str
    email: str
    status: str
    version: int  # Last event version included in snapshot
    created_at: datetime

async def get_user_optimized(user_id: str) -> User:
    """Get user - use snapshot if available."""
    # Get latest snapshot
    snapshot = await get_latest_snapshot(user_id)
    
    # Get events after snapshot
    events = await event_store.get_events_after(user_id, snapshot.version)
    
    # Rebuild from snapshot + new events
    user = User.from_snapshot(snapshot)
    for event in events:
        user.apply_event(event)
    
    return user
```

## Summary

**Choose CRUD when:**
- Simple operations
- Fast reads required
- No audit trail needed
- Standard patterns sufficient

**Choose Event Sourcing when:**
- Audit trail critical
- Need state reconstruction
- Complex domain logic
- Event-driven architecture

Both patterns have their place - choose based on your specific requirements!
