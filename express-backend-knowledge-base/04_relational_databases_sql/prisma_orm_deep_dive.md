# Prisma ORM Deep Dive: Modern Database Toolkit for Express.js

Prisma is a next-generation ORM that provides type-safe database access, auto-generated queries, and excellent developer experience. This guide covers using Prisma in Express.js applications.

## What is Prisma?

**Prisma** is a modern database toolkit that includes:
- Prisma Client: Type-safe database client
- Prisma Migrate: Database migrations
- Prisma Studio: Visual database browser

### Why Prisma?

```javascript
// Traditional ORM: Runtime queries
const users = await User.findAll({ where: { email: 'john@example.com' } });

// Prisma: Type-safe, compile-time checked
const user = await prisma.user.findUnique({
    where: { email: 'john@example.com' }
});
// TypeScript knows the exact return type!
```

**Explanation:**
Prisma provides type-safe database access with auto-completion and compile-time type checking, reducing errors and improving developer experience.

## Installation and Setup

### Install Prisma

```bash
npm install @prisma/client
npm install -D prisma

# Initialize Prisma
npx prisma init
```

### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

model User {
    id        Int      @id @default(autoincrement())
    email     String   @unique
    name      String?
    posts     Post[]
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}

model Post {
    id        Int      @id @default(autoincrement())
    title     String
    content   String?
    published Boolean  @default(false)
    authorId  Int
    author    User     @relation(fields: [authorId], references: [id])
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}
```

**Explanation:**
Prisma schema defines your database structure. It's a declarative schema that Prisma uses to generate the client and migrations.

## Prisma Client Setup

### Initialize Client

```javascript
// lib/prisma.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],  // Log queries
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = prisma;
```

### Use in Express Routes

```javascript
const prisma = require('./lib/prisma');

app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

app.get('/users/:id', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: parseInt(req.params.id) }
    });
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
});
```

## CRUD Operations

### Create

```javascript
// Create single record
const user = await prisma.user.create({
    data: {
        email: 'john@example.com',
        name: 'John Doe'
    }
});

// Create with relation
const post = await prisma.post.create({
    data: {
        title: 'My Post',
        content: 'Post content',
        author: {
            connect: { id: userId }  // Connect to existing user
        }
    }
});

// Create multiple
const users = await prisma.user.createMany({
    data: [
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' }
    ]
});
```

### Read

```javascript
// Find all
const users = await prisma.user.findMany();

// Find with conditions
const activeUsers = await prisma.user.findMany({
    where: {
        email: {
            contains: '@example.com'
        }
    }
});

// Find unique
const user = await prisma.user.findUnique({
    where: { email: 'john@example.com' }
});

// Find first
const firstUser = await prisma.user.findFirst({
    where: { name: { contains: 'John' } }
});

// Include relations
const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
        posts: true  // Include all posts
    }
});

// Select specific fields
const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
        id: true,
        email: true,
        name: true
        // posts not included
    }
});
```

### Update

```javascript
// Update single
const user = await prisma.user.update({
    where: { id: userId },
    data: {
        name: 'John Smith'
    }
});

// Update many
const result = await prisma.user.updateMany({
    where: {
        email: { contains: '@old-domain.com' }
    },
    data: {
        email: {
            // Update logic
        }
    }
});

// Upsert (update or create)
const user = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: { name: 'John Updated' },
    create: {
        email: 'john@example.com',
        name: 'John Doe'
    }
});
```

### Delete

```javascript
// Delete single
await prisma.user.delete({
    where: { id: userId }
});

// Delete many
await prisma.user.deleteMany({
    where: {
        email: { contains: '@temp.com' }
    }
});
```

## Advanced Queries

### Filtering

```javascript
// Complex filters
const users = await prisma.user.findMany({
    where: {
        AND: [
            { email: { contains: '@example.com' } },
            { name: { not: null } }
        ],
        OR: [
            { name: { startsWith: 'John' } },
            { name: { startsWith: 'Jane' } }
        ],
        NOT: {
            email: { contains: 'test' }
        }
    }
});
```

### Pagination

```javascript
// Offset pagination
const users = await prisma.user.findMany({
    skip: 20,   // Skip first 20
    take: 10,    // Take 10
    orderBy: {
        createdAt: 'desc'
    }
});

// Cursor pagination
const users = await prisma.user.findMany({
    take: 10,
    cursor: {
        id: lastUserId
    },
    skip: 1,  // Skip the cursor itself
    orderBy: {
        id: 'asc'
    }
});
```

### Aggregations

```javascript
// Count
const userCount = await prisma.user.count({
    where: { email: { contains: '@example.com' } }
});

// Aggregate
const stats = await prisma.post.aggregate({
    _count: { id: true },
    _avg: { views: true },
    _max: { views: true },
    _min: { views: true },
    _sum: { views: true }
});
```

## Transactions

### Sequential Operations

```javascript
// Sequential operations in transaction
const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
        data: {
            email: 'john@example.com',
            name: 'John Doe'
        }
    });
    
    // Create post
    const post = await tx.post.create({
        data: {
            title: 'My Post',
            authorId: user.id
        }
    });
    
    return { user, post };
});
```

### Interactive Transactions

```javascript
// Interactive transaction with retries
const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
        where: { id: userId }
    });
    
    if (user.balance < amount) {
        throw new Error('Insufficient balance');
    }
    
    await tx.user.update({
        where: { id: userId },
        data: {
            balance: { decrement: amount }
        }
    });
    
    return user;
}, {
    maxWait: 5000,  // Max time to wait for transaction
    timeout: 10000   // Max time transaction can run
});
```

## Real-World Examples

### Example 1: User Management API

```javascript
const prisma = require('./lib/prisma');

// Create user
app.post('/users', async (req, res) => {
    try {
        const user = await prisma.user.create({
            data: {
                email: req.body.email,
                name: req.body.name
            }
        });
        res.status(201).json(user);
    } catch (error) {
        if (error.code === 'P2002') {  // Unique constraint violation
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get user with posts
app.get('/users/:id', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
            posts: {
                where: { published: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
});

// Update user
app.put('/users/:id', async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(user);
    } catch (error) {
        if (error.code === 'P2025') {  // Record not found
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: error.message });
    }
});
```

### Example 2: Blog with Categories

```javascript
// Get posts with category and author
app.get('/posts', async (req, res) => {
    const posts = await prisma.post.findMany({
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            category: true
        },
        where: {
            published: true
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 20
    });
    
    res.json(posts);
});

// Create post with category
app.post('/posts', async (req, res) => {
    const post = await prisma.post.create({
        data: {
            title: req.body.title,
            content: req.body.content,
            author: {
                connect: { id: req.body.authorId }
            },
            category: {
                connect: { id: req.body.categoryId }
            }
        },
        include: {
            author: true,
            category: true
        }
    });
    
    res.status(201).json(post);
});
```

## Migrations

### Create Migration

```bash
# Create migration
npx prisma migrate dev --name add_phone_to_users

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

### Migration File

```prisma
// Migration automatically generated
model User {
    id        Int      @id @default(autoincrement())
    email     String   @unique
    name      String?
    phone     String?  // New field
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}
```

## Best Practices

1. **Use TypeScript**: Prisma works best with TypeScript for type safety
2. **Connection Pooling**: Prisma handles connection pooling automatically
3. **Select Fields**: Use `select` to fetch only needed fields
4. **Batch Operations**: Use `createMany`, `updateMany` for bulk operations
5. **Error Handling**: Handle Prisma error codes appropriately

## Common Prisma Error Codes

```javascript
// P2002: Unique constraint violation
if (error.code === 'P2002') {
    // Handle duplicate
}

// P2025: Record not found
if (error.code === 'P2025') {
    // Handle not found
}

// P2003: Foreign key constraint violation
if (error.code === 'P2003') {
    // Handle foreign key error
}
```

## Summary

**Prisma ORM Deep Dive:**

1. **Purpose**: Type-safe database toolkit with excellent DX
2. **Features**: Type-safe queries, migrations, visual browser
3. **Operations**: CRUD with relations, transactions, aggregations
4. **Best Practice**: Use TypeScript, select fields, handle errors
5. **Migrations**: Declarative schema, automatic migrations

**Key Takeaway:**
Prisma is a modern ORM that provides type-safe database access with excellent developer experience. It uses a declarative schema to generate type-safe clients and handle migrations. Prisma automatically handles connection pooling and provides great TypeScript support. Use Prisma for type safety and developer productivity.

**Prisma Advantages:**
- Type-safe queries
- Auto-completion
- Declarative schema
- Automatic migrations
- Great TypeScript support

**Next Steps:**
- Learn [TypeORM Deep Dive](typeorm_deep_dive.md) for alternative ORM
- Study [Sequelize Deep Dive](sequelize_deep_dive.md) for traditional ORM
- Master [Migrations](sequelize_migrations.md) for schema management

