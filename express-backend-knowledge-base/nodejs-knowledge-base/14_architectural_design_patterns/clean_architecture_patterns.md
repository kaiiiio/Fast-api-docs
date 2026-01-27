# Architectural & Design Patterns in Node.js

Building scalable Node.js applications requires following proven architectural and design patterns.

## 1. Clean Architecture (Layered)
The goal is to separate concerns and make the application independent of frameworks, UI, and databases.
- **Entities**: Business logic (Core).
- **Use Cases**: Application-specific logic.
- **Controllers/Adapters**: Bridges between the external world and code.
- **Infrastructure**: External tools (Database, Mailers).

---

## 2. Dependency Injection (DI)
Instead of a module importing its dependencies, they are passed (injected) to it. This makes testing much easier using mocks.

```javascript
// Service
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  
  async getUser(id) {
    return this.userRepository.findById(id);
  }
}

// Controller
const repo = new PostgresUserRepository();
const service = new UserService(repo);
```

---

## 3. Repository Pattern
Mediates between the domain and data mapping layers. It provides a collections-like interface for accessing domain objects.
- **Benefit**: You can swap MongoDB for PostgreSQL by just changing the Repository implementation without touching your business logic.

---

## 4. Factory Pattern
Used to create objects without specifying the exact class of the object that will be created.

```javascript
class DatabaseFactory {
  static create(type) {
    if (type === 'mongo') return new MongoDb();
    if (type === 'sql') return new PostgreSql();
    throw new Error('Unsupported database type');
  }
}
```

---

## 5. Singleton Pattern
Ensures a class has only one instance and provides a global point of access to it.
- **Common Usage**: Database connection pools.

```javascript
class Database {
  constructor() {
    if (!Database.instance) {
      this.connection = this.connect();
      Database.instance = this;
    }
    return Database.instance;
  }
  
  connect() { /* ... */ }
}
const instance = new Database();
Object.freeze(instance);
module.exports = instance;
```

---

## 6. Observer Pattern (EventEmitter)
A mechanism where an object (the subject) maintains a list of its dependents (observers) and notifies them of any state changes.
- **Node.js Implementation**: Built-in `EventEmitter`.

---

## 7. Strategy Pattern
Defines a family of algorithms, encapsulates each one, and makes them interchangeable.
- **Common Usage**: Authentication strategies (Passport.js).
