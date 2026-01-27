# Prisma vs TypeORM: Comprehensive Comparison Guide

A detailed comparison between Prisma and TypeORM for both SQL and NoSQL databases, covering syntax differences, use cases, and interview preparation.

## Table of Contents
1. [Overview](#overview)
2. [SQL Database Support](#sql-database-support)
3. [NoSQL Database Support](#nosql-database-support)
4. [Syntax Comparison](#syntax-comparison)
5. [Architecture Differences](#architecture-differences)
6. [Performance Comparison](#performance-comparison)
7. [Migration Systems](#migration-systems)
8. [When to Use Which](#when-to-use-which)
9. [Interview Questions](#interview-questions)

---

## Overview

### Prisma  --- IMP
**Definition:** Prisma is a next-generation ORM that provides type-safe database access through a declarative schema and auto-generated client.

**Key Characteristics:**
- Schema-first approach
- Type-safe queries with auto-completion
- Declarative migrations
- Excellent TypeScript support
- Modern developer experience

### TypeORM
**Definition:** TypeORM is a mature ORM that supports both Active Record and Data Mapper patterns, using decorators for entity definition.

**Key Characteristics:**
- Code-first approach (decorators)
- Supports both TypeScript and JavaScript
- Active Record and Repository patterns
- Extensive database support
- Mature ecosystem

---

## SQL Database Support

### Database Compatibility

| Database | Prisma | TypeORM |
|----------|--------|---------|
| **PostgreSQL** | ✅ Full support | ✅ Full support |
| **MySQL** | ✅ Full support | ✅ Full support |
| **SQLite** | ✅ Full support | ✅ Full support |
| **SQL Server** | ✅ Full support | ✅ Full support |
| **CockroachDB** | ✅ Full support | ✅ Full support |
| **MariaDB** | ✅ Full support | ✅ Full support |

### Entity Definition Comparison

#### Prisma (Schema-First)

```prisma
// schema.prisma
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
}
```

**Explanation:**
- Declarative schema in `.prisma` file
- Database structure defined in one place
- Auto-generates TypeScript types
- Clear relationship definitions

#### TypeORM (Code-First)

```typescript
// entities/User.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Post } from './Post';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ unique: true })
    email: string;
    
    @Column({ nullable: true })
    name: string;
    
    @OneToMany(() => Post, post => post.author)
    posts: Post[];
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
}

// entities/Post.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('posts')
export class Post {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    title: string;
    
    @Column({ type: 'text', nullable: true })
    content: string;
    
    @Column({ default: false })
    published: boolean;
    
    @ManyToOne(() => User, user => user.posts)
    @JoinColumn({ name: 'author_id' })
    author: User;
    
    @Column({ name: 'author_id' })
    authorId: number;
    
    @CreateDateColumn()
    createdAt: Date;
}
```

**Explanation:**
- Decorator-based entity classes
- Each entity is a separate TypeScript class
- Decorators define database structure
- Requires both virtual property and actual column for foreign keys

---

## NoSQL Database Support

### MongoDB Support Comparison

| Feature | Prisma | TypeORM |
|---------|--------|---------|
| **MongoDB Support** | ✅ Yes (Limited) | ✅ Yes (Full) |
| **Embedded Documents** | ⚠️ Limited | ✅ Full support |
| **Transactions** | ⚠️ Basic | ✅ Full support |
| **Aggregation Pipeline** | ❌ No | ✅ Yes |
| **GridFS** | ❌ No | ✅ Yes |

### MongoDB Entity Definition

#### Prisma (MongoDB)

```prisma
// schema.prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String   @db.ObjectId
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

**Limitations:**
- No aggregation pipeline support
- Limited embedded document support
- Basic transaction support only

#### TypeORM (MongoDB)

```typescript
// entities/User.ts
// Entity - TypeORM decorator marking a class as a database entity (table/collection)
// Maps TypeScript class to MongoDB collection (or SQL table)
// @Entity('users') - 'users' is the collection/table name
// Without name argument, uses class name in lowercase

// ObjectIdColumn - MongoDB-specific decorator for _id field
// Marks property as MongoDB's primary key (_id)
// Different from @PrimaryGeneratedColumn (used for SQL auto-increment)
// Must be used with ObjectId type for MongoDB

// ObjectId - MongoDB's unique identifier type (12-byte BSON type)
// Not a string or number, it's a special MongoDB type
// Contains timestamp, machine ID, process ID, and counter
// Example: ObjectId("507f1f77bcf86cd799439011")

// Column - Generic decorator for regular database columns/fields
// Maps class property to database field
// Can specify type, nullable, default, unique, etc.
// Works for both SQL and NoSQL databases

// CreateDateColumn - Auto-managed timestamp for record creation
// Automatically sets value when entity is first saved
// TypeORM handles this, you don't set it manually
// Useful for tracking when records were created

// UpdateDateColumn - Auto-managed timestamp for record updates
// Automatically updates value whenever entity is saved
// TypeORM handles this, you don't set it manually
// Useful for tracking when records were last modified
import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @ObjectIdColumn()
    id: ObjectId;
    
    @Column()
    email: string;
    
    @Column()
    name: string;
    
    // Embedded documents
    @Column()
    profile: {
        bio: string;
        avatar: string;
        social: {
            twitter: string;
            github: string;
        }
    };
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
}

// Using aggregation pipeline
const stats = await userRepository.aggregate([
    { $match: { email: { $regex: '@gmail.com' } } },
    { $group: { _id: null, count: { $sum: 1 } } }
]).toArray();
```

**Advantages:**
- Full MongoDB feature support
- Embedded documents
- Aggregation pipeline
- GridFS for file storage

---

## Syntax Comparison

### 1. Database Connection

#### Prisma

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Single instance pattern
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
```

**Key Points:**
- Single client instance
- Auto-manages connection pool
- Configuration in `schema.prisma`

#### TypeORM

```typescript
// data-source.ts
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Post } from './entity/Post';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User, Post],
    synchronize: false,  // Never true in production!
    logging: true,
    migrations: ['src/migration/**/*.ts'],
});

// Initialize
AppDataSource.initialize()
    .then(() => console.log('Database connected'))
    .catch(error => console.error('Connection error:', error));
```

**Key Points:**
- Explicit configuration
- Manual connection initialization
- Must import all entities

---

### 2. CRUD Operations

#### Create

**Prisma:**
```typescript
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
        content: 'Content here',
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

**TypeORM:**
```typescript
const userRepository = AppDataSource.getRepository(User);

// Create single record
const user = userRepository.create({
    email: 'john@example.com',
    name: 'John Doe'
});
await userRepository.save(user);

// Create with relation
const post = new Post();
post.title = 'My Post';
post.content = 'Content here';
post.authorId = userId;
await postRepository.save(post);

// Create multiple
const users = userRepository.create([
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' }
]);
await userRepository.save(users);
```

---

#### Read

**Prisma:**
```typescript
// Find all
const users = await prisma.user.findMany();

// Find with conditions
const users = await prisma.user.findMany({
    where: {
        email: { contains: '@example.com' }
    }
});

// Find unique
const user = await prisma.user.findUnique({
    where: { email: 'john@example.com' }
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

**TypeORM:**
```typescript
// Find all
const users = await userRepository.find();

// Find with conditions
const users = await userRepository.find({
    where: {
        email: Like('%@example.com%')
    }
});

// Find one
const user = await userRepository.findOne({
    where: { email: 'john@example.com' }
});

// Include relations
const user = await userRepository.findOne({
    where: { id: userId },
    relations: ['posts']  // Include posts
});

// Select specific fields
const user = await userRepository.findOne({
    where: { id: userId },
    select: {
        id: true,
        email: true,
        name: true
    }
});
```

---

#### Update

**Prisma:**
```typescript
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
        // Update fields
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

**TypeORM:**
```typescript
// Update single
const user = await userRepository.findOne({ where: { id: userId } });
user.name = 'John Smith';
await userRepository.save(user);

// Or using update
await userRepository.update({ id: userId }, { name: 'John Smith' });

// Update many
await userRepository.update(
    { email: Like('%@old-domain.com%') },
    { /* update fields */ }
);

// No built-in upsert, must implement manually
const user = await userRepository.findOne({ where: { email: 'john@example.com' } });
if (user) {
    user.name = 'John Updated';
    await userRepository.save(user);
} else {
    const newUser = userRepository.create({
        email: 'john@example.com',
        name: 'John Doe'
    });
    await userRepository.save(newUser);
}
```

---

#### Delete

**Prisma:**
```typescript
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

**TypeORM:**
```typescript
// Delete single
await userRepository.delete({ id: userId });

// Delete many
await userRepository.delete({
    email: Like('%@temp.com%')
});
```

---

### 3. Complex Queries

#### Prisma

```typescript
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

// Aggregations
const stats = await prisma.post.aggregate({
    _count: { id: true },
    _avg: { views: true },
    _max: { views: true },
    _min: { views: true },
    _sum: { views: true }
});

// Group by
const result = await prisma.user.groupBy({
    by: ['email'],
    _count: {
        id: true
    },
    having: {
        id: {
            _count: {
                gt: 1
            }
        }
    }
});
```

#### TypeORM

```typescript
// Complex filters with Query Builder
const users = await userRepository
    .createQueryBuilder('user')
    .where('user.email LIKE :email', { email: '%@example.com%' })
    .andWhere('user.name IS NOT NULL')
    .andWhere(
        new Brackets(qb => {
            qb.where('user.name LIKE :john', { john: 'John%' })
              .orWhere('user.name LIKE :jane', { jane: 'Jane%' });
        })
    )
    .andWhere('user.email NOT LIKE :test', { test: '%test%' })
    .getMany();

// Aggregations
const stats = await postRepository
    .createQueryBuilder('post')
    .select('COUNT(post.id)', 'count')
    .addSelect('AVG(post.views)', 'avgViews')
    .addSelect('MAX(post.views)', 'maxViews')
    .addSelect('MIN(post.views)', 'minViews')
    .addSelect('SUM(post.views)', 'sumViews')
    .getRawOne();

// Group by
const result = await userRepository
    .createQueryBuilder('user')
    .select('user.email')
    .addSelect('COUNT(user.id)', 'count')
    .groupBy('user.email')
    .having('COUNT(user.id) > :count', { count: 1 })
    .getRawMany();
```

---

### 4. Transactions

#### Prisma

```typescript
// Interactive transaction
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

// Batch transaction
await prisma.$transaction([
    prisma.user.create({ data: { email: 'user1@example.com' } }),
    prisma.user.create({ data: { email: 'user2@example.com' } }),
    prisma.user.create({ data: { email: 'user3@example.com' } })
]);
```

#### TypeORM

```typescript
// Using QueryRunner
const queryRunner = AppDataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
    // Create user
    const user = new User();
    user.email = 'john@example.com';
    user.name = 'John Doe';
    await queryRunner.manager.save(user);
    
    // Create post
    const post = new Post();
    post.title = 'My Post';
    post.authorId = user.id;
    await queryRunner.manager.save(post);
    
    await queryRunner.commitTransaction();
} catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
} finally {
    await queryRunner.release();
}

// Using transaction method
await AppDataSource.transaction(async (manager) => {
    const user = manager.create(User, { email: 'john@example.com', name: 'John' });
    await manager.save(user);
    
    const post = manager.create(Post, { title: 'My Post', authorId: user.id });
    await manager.save(post);
});
```

---

## Migration Systems

### Prisma Migrations

```bash
# Create migration from schema changes
npx prisma migrate dev --name add_user_table

# Apply migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

**Workflow:**
1. Modify `schema.prisma`
2. Run `prisma migrate dev`
3. Prisma generates SQL migration
4. Migration is applied to database
5. Prisma Client is regenerated

**Advantages:**
- Declarative schema
- Auto-generated migrations
- Type-safe client regeneration

### TypeORM Migrations

```bash
# Generate migration from entity changes
npx typeorm migration:generate -n AddUserTable

# Create empty migration
npx typeorm migration:create -n AddUserTable

# Run migrations
npx typeorm migration:run

# Revert last migration
npx typeorm migration:revert
```

**Migration File:**
```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddUserTable1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        isUnique: true
                    }
                ]
            }),
            true
        );
    }
    
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('users');
    }
}
```

**Workflow:**
1. Modify entity classes
2. Run `typeorm migration:generate`
3. Review generated SQL
4. Run `typeorm migration:run`

**Advantages:**
- Full control over migrations
- Can write custom SQL
- Explicit up/down methods

---

## Architecture Differences

### Prisma Architecture

```
┌─────────────────────────────────────────┐
│  Application Code (TypeScript/JS)      │
├─────────────────────────────────────────┤
│  Prisma Client (Auto-generated)        │
│  - Type-safe queries                   │
│  - Auto-completion                     │
├─────────────────────────────────────────┤
│  Prisma Query Engine (Rust)            │
│  - Query optimization                  │
│  - Connection pooling                  │
├─────────────────────────────────────────┤
│  Database (PostgreSQL, MySQL, etc.)    │
└─────────────────────────────────────────┘
```

**Key Points:**
- Schema-first approach
- Rust-based query engine for performance
- Auto-generated client
- Single source of truth (schema.prisma)

### TypeORM Architecture

```
┌─────────────────────────────────────────┐
│  Application Code (TypeScript/JS)      │
├─────────────────────────────────────────┤
│  TypeORM                                │
│  - Repository Pattern                  │
│  - Active Record Pattern               │
│  - Query Builder                       │
├─────────────────────────────────────────┤
│  Database Driver (pg, mysql2, etc.)    │
├─────────────────────────────────────────┤
│  Database (PostgreSQL, MySQL, etc.)    │
└─────────────────────────────────────────┘
```

**Key Points:**
- Code-first approach
- Decorator-based entities
- Multiple patterns (Repository, Active Record)
- Direct database driver usage

---

## Performance Comparison

### Query Performance

| Operation | Prisma | TypeORM | Notes |
|-----------|--------|---------|-------|
| **Simple Queries** | ⚡ Fast | ⚡ Fast | Similar performance |
| **Complex Joins** | ⚡ Fast | ⚡⚡ Faster | TypeORM Query Builder more flexible |
| **Bulk Operations** | ⚡⚡ Faster | ⚡ Fast | Prisma optimizes bulk ops |
| **Type Safety** | ⚡⚡⚡ Excellent | ⚡ Good | Prisma has better type inference |
| **Cold Start** | ⚠️ Slower | ⚡ Fast | Prisma generates client |

### Connection Pooling

**Prisma:**
- Automatic connection pooling
- Configured via connection string
- No manual pool management

```typescript
// DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
const prisma = new PrismaClient();
```

**TypeORM:**
- Manual pool configuration
- More control over pool settings

```typescript
const AppDataSource = new DataSource({
    type: 'postgres',
    // ... other config
    extra: {
        max: 10,  // Maximum pool size
        min: 2,   // Minimum pool size
        idleTimeoutMillis: 30000
    }
});
```

---

## When to Use Which

### Choose Prisma When:

✅ **Type Safety is Critical**
- TypeScript project
- Need compile-time type checking
- Want auto-completion everywhere

✅ **Developer Experience Matters**
- Modern development workflow
- Want declarative schema
- Need visual database browser (Prisma Studio)

✅ **Simple to Medium Complexity**
- Standard CRUD operations
- Straightforward relationships
- SQL databases only (or basic MongoDB)

✅ **Team Prefers Schema-First**
- Single source of truth
- Clear database structure
- Auto-generated migrations

**Example Use Cases:**
- Modern web applications
- API backends
- Microservices
- Startups and MVPs

---

### Choose TypeORM When:

✅ **Flexibility is Important**
- Need complex custom queries
- Require fine-grained control
- Multiple database types (SQL + MongoDB)

✅ **Mature Ecosystem Needed**
- Large existing community
- Extensive documentation
- Proven in production

✅ **MongoDB Features Required**
- Aggregation pipelines
- Embedded documents
- GridFS
- Full MongoDB support

✅ **Legacy Codebase**
- Existing TypeORM project
- Migration from Sequelize
- JavaScript (not TypeScript)

**Example Use Cases:**
- Enterprise applications
- Complex data models
- MongoDB-heavy applications
- Legacy system migrations

---

## Interview Questions   --- IMP

### Q1: Explain the key differences between Prisma and TypeORM. When would you choose one over the other?

**Answer:**

**Key Differences:**

**1. Approach:**
- **Prisma:** Schema-first (declarative schema in `.prisma` file)
- **TypeORM:** Code-first (decorator-based entity classes)

**2. Type Safety:**
- **Prisma:** Excellent type safety with auto-generated client
- **TypeORM:** Good type safety but requires manual type definitions

**3. Developer Experience:**
- **Prisma:** Modern DX with auto-completion, Prisma Studio
- **TypeORM:** Traditional ORM experience, more manual setup

**4. Database Support:**
- **Prisma:** SQL databases + basic MongoDB
- **TypeORM:** SQL databases + full MongoDB support

**5. Query Building:**
- **Prisma:** Type-safe query API
- **TypeORM:** Flexible Query Builder + Repository pattern

**When to Choose:**

**Prisma:**
```typescript
// Type-safe, auto-completion, clean syntax
const user = await prisma.user.findUnique({
    where: { email: 'john@example.com' },
    include: {
        posts: {
            where: { published: true }
        }
    }
});
// TypeScript knows exact return type!
```

**TypeORM:**
```typescript
// More control, complex queries
const users = await userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.posts', 'post')
    .where('post.published = :published', { published: true })
    .andWhere('user.email LIKE :email', { email: '%@gmail.com%' })
    .orderBy('user.createdAt', 'DESC')
    .getMany();
```

---

### Q2: How do Prisma and TypeORM handle migrations differently?

**Answer:**

**Prisma Migrations:**

```bash
# 1. Modify schema.prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  phone String?  // Add new field
}

# 2. Generate migration
npx prisma migrate dev --name add_phone_to_users

# 3. Prisma auto-generates SQL
# migrations/20240101_add_phone_to_users/migration.sql
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
```

**Advantages:**
- Declarative schema
- Auto-generated SQL
- Type-safe client regeneration
- Single source of truth

**TypeORM Migrations:**

```typescript
// 1. Modify entity
@Entity()
export class User {
    @Column({ nullable: true })
    phone: string;  // Add new field
}

// 2. Generate migration
npx typeorm migration:generate -n AddPhoneToUsers

// 3. Review generated migration
export class AddPhoneToUsers1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('users', new TableColumn({
            name: 'phone',
            type: 'varchar',
            isNullable: true
        }));
    }
    
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'phone');
    }
}

// 4. Run migration
npx typeorm migration:run
```

**Advantages:**
- Full control over SQL
- Explicit up/down methods
- Can write custom SQL
- More flexible for complex changes

---

### Q3: Compare Prisma and TypeORM for MongoDB. Which is better and why?

**Answer:**

**TypeORM is significantly better for MongoDB.**

**Prisma MongoDB Limitations:**

```typescript
// Prisma: Basic MongoDB support
const user = await prisma.user.findMany({
    where: {
        email: { contains: '@gmail.com' }
    }
});

// ❌ No aggregation pipeline
// ❌ Limited embedded documents
// ❌ No GridFS
// ❌ Basic transactions only
```

**TypeORM MongoDB Full Support:**

```typescript
// 1. Embedded Documents
@Entity()
export class User {
    @ObjectIdColumn()
    id: ObjectId;
    
    @Column()
    profile: {
        bio: string;
        avatar: string;
        social: {
            twitter: string;
            github: string;
        }
    };  // ✅ Full embedded document support
}

// 2. Aggregation Pipeline
const stats = await userRepository.aggregate([
    { $match: { email: { $regex: '@gmail.com' } } },
    { $group: { 
        _id: '$country', 
        count: { $sum: 1 },
        avgAge: { $avg: '$age' }
    }},
    { $sort: { count: -1 } }
]).toArray();  // ✅ Full aggregation support

// 3. GridFS for file storage
// ✅ Supported in TypeORM

// 4. Full transaction support
// ✅ Supported in TypeORM
```

**Recommendation:**
- **For MongoDB:** Use TypeORM or Mongoose
- **For SQL:** Either Prisma or TypeORM (depends on preferences)

---

### Q4: How do Prisma and TypeORM handle relationships differently?

**Answer:**

**Prisma Relationships:**

```prisma
// schema.prisma - Declarative
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]  // Virtual relation
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}
```

```typescript
// Usage - Clean and type-safe
const user = await prisma.user.findUnique({
    where: { id: 1 },
    include: {
        posts: true  // Include related posts
    }
});
```

**TypeORM Relationships:**

```typescript
// Entity - Decorator-based
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    email: string;
    
    @OneToMany(() => Post, post => post.author)
    posts: Post[];  // Virtual property
}

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    title: string;
    
    @ManyToOne(() => User, user => user.posts)
    @JoinColumn({ name: 'author_id' })
    author: User;  // Virtual property
    
    @Column({ name: 'author_id' })
    authorId: number;  // Actual column
}
```

```typescript
// Usage - More verbose
const user = await userRepository.findOne({
    where: { id: 1 },
    relations: ['posts']  // Include related posts
});
```

**Key Differences:**
- **Prisma:** Single relation definition, cleaner syntax
- **TypeORM:** Requires both virtual property and actual column for foreign keys

---

### Q5: What are the performance implications of using Prisma vs TypeORM?

**Answer:**

**Prisma Performance:**

**Advantages:**
- Rust-based query engine (faster query execution)
- Optimized bulk operations
- Automatic query optimization

**Disadvantages:**
- Slower cold start (client generation)
- Less flexible for complex queries

```typescript
// Prisma: Optimized bulk insert
await prisma.user.createMany({
    data: [/* 1000 users */]
});  // Single optimized query
```

**TypeORM Performance:**

**Advantages:**
- Fast cold start
- Flexible Query Builder for optimization
- Direct SQL when needed

**Disadvantages:**
- Less automatic optimization
- Manual query tuning required

```typescript
// TypeORM: Manual optimization needed
await userRepository.save([/* 1000 users */]);  // Multiple queries

// Better: Use query builder
await userRepository
    .createQueryBuilder()
    .insert()
    .values([/* 1000 users */])
    .execute();  // Single query
```

**Benchmark Results (Approximate):**

| Operation | Prisma | TypeORM |
|-----------|--------|---------|
| Simple CRUD | 100ms | 95ms |
| Bulk Insert (1000 rows) | 150ms | 200ms |
| Complex Join | 120ms | 100ms |
| Cold Start | 500ms | 50ms |

**Recommendation:**
- **Prisma:** Better for standard operations, bulk inserts
- **TypeORM:** Better for complex queries, custom optimization

---

## GraphQL with ORMs

### What is GraphQL?

**Definition:** GraphQL is a query language for APIs and a runtime for executing those queries. It provides a complete and understandable description of the data in your API, giving clients the power to ask for exactly what they need.

**Key Concepts:**
- **Query Language:** Not a database query language, but an API query language
- **Type System:** Strongly typed schema defines your API structure
- **Single Endpoint:** Unlike REST with multiple endpoints, GraphQL uses one endpoint
- **Client-Specified Queries:** Clients request exactly the data they need
- **No Over-fetching/Under-fetching:** Get precisely what you ask for

**GraphQL vs REST:**

| Feature | GraphQL | REST |
|---------|---------|------|
| **Endpoints** | Single endpoint | Multiple endpoints |
| **Data Fetching** | Get exactly what you need | Often over/under-fetch |
| **Versioning** | No versioning needed | API versioning required |
| **Learning Curve** | Steeper | Gentler |
| **Caching** | More complex | Simple (HTTP caching) |
| **Real-time** | Built-in (subscriptions) | Requires WebSockets |

---

### GraphQL Schema Basics

```graphql
# Type definitions
type User {
  id: ID!
  email: String!
  name: String
  posts: [Post!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String
  published: Boolean!
  author: User!
  createdAt: DateTime!
}

# Queries (Read operations)
type Query {
  users: [User!]!
  user(id: ID!): User
  posts(published: Boolean): [Post!]!
  post(id: ID!): Post
}

# Mutations (Write operations)
type Mutation {
  createUser(email: String!, name: String): User!
  updateUser(id: ID!, name: String): User!
  deleteUser(id: ID!): Boolean!
  
  createPost(title: String!, content: String, authorId: ID!): Post!
  publishPost(id: ID!): Post!
}

# Subscriptions (Real-time)
type Subscription {
  postCreated: Post!
  userUpdated(id: ID!): User!
}
```

**Explanation:**
- `!` means non-nullable (required field)
- `[Post!]!` means non-nullable array of non-nullable Posts
- `ID` is a special scalar type for unique identifiers
- `Query` type defines all read operations
- `Mutation` type defines all write operations
- `Subscription` type defines real-time updates

---

### GraphQL with SQL Databases

#### Using GraphQL with Prisma

**Setup:**
```bash
npm install @apollo/server graphql
npm install -D @graphql-codegen/cli
```

**Complete Example:**

```typescript
// schema.graphql
type User {
  id: ID!
  email: String!
  name: String
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String
  published: Boolean!
  author: User!
}

type Query {
  users: [User!]!
  user(id: ID!): User
  posts: [Post!]!
}

type Mutation {
  createUser(email: String!, name: String): User!
  createPost(title: String!, authorId: ID!): Post!
}
```

**Resolvers with Prisma:**

```typescript
// resolvers.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    // Get all users
    users: async () => {
      return await prisma.user.findMany({
        include: { posts: true }
      });
    },
    
    // Get single user
    user: async (_parent: any, args: { id: string }) => {
      return await prisma.user.findUnique({
        where: { id: parseInt(args.id) },
        include: { posts: true }
      });
    },
    
    // Get all posts
    posts: async () => {
      return await prisma.post.findMany({
        include: { author: true }
      });
    }
  },
  
  Mutation: {
    // Create user
    createUser: async (_parent: any, args: { email: string; name?: string }) => {
      return await prisma.user.create({
        data: {
          email: args.email,
          name: args.name
        }
      });
    },
    
    // Create post
    createPost: async (_parent: any, args: { title: string; authorId: string }) => {
      return await prisma.post.create({
        data: {
          title: args.title,
          authorId: parseInt(args.authorId)
        },
        include: { author: true }
      });
    }
  },
  
  // Field resolvers (optional, for custom logic)
  User: {
    posts: async (parent: any) => {
      return await prisma.post.findMany({
        where: { authorId: parent.id }
      });
    }
  },
  
  Post: {
    author: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.authorId }
      });
    }
  }
};
```

**Apollo Server Setup:**

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { resolvers } from './resolvers';

const typeDefs = readFileSync('./schema.graphql', { encoding: 'utf-8' });

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at: ${url}`);
```

**Example Queries:**

```graphql
# Get all users with their posts
query GetUsers {
  users {
    id
    email
    name
    posts {
      id
      title
      published
    }
  }
}

# Get specific user
query GetUser {
  user(id: "1") {
    id
    email
    name
    posts {
      title
    }
  }
}

# Create user
mutation CreateUser {
  createUser(email: "john@example.com", name: "John Doe") {
    id
    email
    name
  }
}

# Create post
mutation CreatePost {
  createPost(title: "My First Post", authorId: "1") {
    id
    title
    author {
      name
    }
  }
}
```

---

#### Using GraphQL with TypeORM

**Resolvers with TypeORM:**

```typescript
// resolvers.ts
import { AppDataSource } from './data-source';
import { User } from './entity/User';
import { Post } from './entity/Post';

const userRepository = AppDataSource.getRepository(User);
const postRepository = AppDataSource.getRepository(Post);

export const resolvers = {
  Query: {
    users: async () => {
      return await userRepository.find({
        relations: ['posts']
      });
    },
    
    user: async (_parent: any, args: { id: string }) => {
      return await userRepository.findOne({
        where: { id: parseInt(args.id) },
        relations: ['posts']
      });
    },
    
    posts: async () => {
      return await postRepository.find({
        relations: ['author']
      });
    }
  },
  
  Mutation: {
    createUser: async (_parent: any, args: { email: string; name?: string }) => {
      const user = userRepository.create({
        email: args.email,
        name: args.name
      });
      return await userRepository.save(user);
    },
    
    createPost: async (_parent: any, args: { title: string; authorId: string }) => {
      const post = postRepository.create({
        title: args.title,
        authorId: parseInt(args.authorId)
      });
      return await postRepository.save(post);
    }
  },
  
  // Field resolvers
  User: {
    posts: async (parent: User) => {
      return await postRepository.find({
        where: { authorId: parent.id }
      });
    }
  },
  
  Post: {
    author: async (parent: Post) => {
      return await userRepository.findOne({
        where: { id: parent.authorId }
      });
    }
  }
};
```

---

### GraphQL with MongoDB

#### Using GraphQL with Prisma (MongoDB)

**Prisma Schema:**

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String   @db.ObjectId
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

**Resolvers (Same as SQL):**

```typescript
// The resolvers code is identical to SQL version!
// Prisma abstracts the database differences

export const resolvers = {
  Query: {
    users: async () => {
      return await prisma.user.findMany({
        include: { posts: true }
      });
    },
    // ... rest is the same
  }
};
```

**Key Point:** With Prisma, GraphQL resolvers are database-agnostic. The same resolver code works for both SQL and MongoDB!

---

#### Using GraphQL with TypeORM (MongoDB)

**Entity Definition:**

```typescript
// entity/User.ts
import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';

@Entity('users')
export class User {
    @ObjectIdColumn()
    id: ObjectId;
    
    @Column()
    email: string;
    
    @Column()
    name: string;
    
    // Virtual field for posts
    posts?: Post[];
}

// entity/Post.ts
@Entity('posts')
export class Post {
    @ObjectIdColumn()
    id: ObjectId;
    
    @Column()
    title: string;
    
    @Column()
    content: string;
    
    @Column()
    published: boolean;
    
    @Column()
    authorId: ObjectId;
    
    // Virtual field for author
    author?: User;
}
```

**Resolvers with MongoDB:**

```typescript
import { AppDataSource } from './data-source';
import { User } from './entity/User';
import { Post } from './entity/Post';
import { ObjectId } from 'mongodb';

const userRepository = AppDataSource.getMongoRepository(User);
const postRepository = AppDataSource.getMongoRepository(Post);

export const resolvers = {
  Query: {
    users: async () => {
      const users = await userRepository.find();
      
      // Manually populate posts
      for (const user of users) {
        user.posts = await postRepository.find({
          where: { authorId: user.id }
        });
      }
      
      return users;
    },
    
    user: async (_parent: any, args: { id: string }) => {
      const user = await userRepository.findOne({
        where: { _id: new ObjectId(args.id) }
      });
      
      if (user) {
        user.posts = await postRepository.find({
          where: { authorId: user.id }
        });
      }
      
      return user;
    }
  },
  
  Mutation: {
    createUser: async (_parent: any, args: { email: string; name?: string }) => {
      const user = userRepository.create({
        email: args.email,
        name: args.name
      });
      return await userRepository.save(user);
    },
    
    createPost: async (_parent: any, args: { title: string; authorId: string }) => {
      const post = postRepository.create({
        title: args.title,
        authorId: new ObjectId(args.authorId),
        published: false
      });
      return await postRepository.save(post);
    }
  },
  
  // MongoDB-specific aggregation example
  Query: {
    userStats: async () => {
      return await userRepository.aggregate([
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'authorId',
            as: 'posts'
          }
        },
        {
          $project: {
            email: 1,
            name: 1,
            postCount: { $size: '$posts' }
          }
        }
      ]).toArray();
    }
  }
};
```

---

### Advanced GraphQL Patterns

#### DataLoader (N+1 Problem Solution)

**Problem:** Without DataLoader, fetching users with posts causes N+1 queries:
```
1 query for users
N queries for each user's posts (one per user)
```

**Solution with DataLoader:**

```typescript
import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create DataLoader for batching
const postLoader = new DataLoader(async (authorIds: number[]) => {
  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: authorIds }
    }
  });
  
  // Group posts by authorId
  const postsByAuthor = authorIds.map(id =>
    posts.filter(post => post.authorId === id)
  );
  
  return postsByAuthor;
});

// Use in resolver
export const resolvers = {
  User: {
    posts: async (parent: any, _args: any, context: any) => {
      return context.postLoader.load(parent.id);
    }
  }
};

// Pass DataLoader in context
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await startStandaloneServer(server, {
  context: async () => ({
    postLoader: new DataLoader(/* ... */)
  })
});
```

**Result:** Multiple user post fetches are batched into a single query!

---

#### GraphQL Subscriptions (Real-time)

```typescript
// schema.graphql
type Subscription {
  postCreated: Post!
  postUpdated(id: ID!): Post!
}
```

**Resolver with PubSub:**

```typescript
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const resolvers = {
  Mutation: {
    createPost: async (_parent: any, args: any) => {
      const post = await prisma.post.create({
        data: args,
        include: { author: true }
      });
      
      // Publish event
      pubsub.publish('POST_CREATED', { postCreated: post });
      
      return post;
    }
  },
  
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator(['POST_CREATED'])
    }
  }
};
```

**Client Subscription:**

```graphql
subscription OnPostCreated {
  postCreated {
    id
    title
    author {
      name
    }
  }
}
```

---

### GraphQL Best Practices

#### 1. Pagination

```graphql
type Query {
  posts(skip: Int, take: Int): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

**Resolver:**

```typescript
posts: async (_parent: any, args: { skip?: number; take?: number }) => {
  const skip = args.skip || 0;
  const take = args.take || 10;
  
  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      skip,
      take,
      include: { author: true }
    }),
    prisma.post.count()
  ]);
  
  return {
    edges: posts.map(post => ({
      node: post,
      cursor: Buffer.from(post.id.toString()).toString('base64')
    })),
    pageInfo: {
      hasNextPage: skip + take < totalCount,
      hasPreviousPage: skip > 0,
      startCursor: posts[0] ? Buffer.from(posts[0].id.toString()).toString('base64') : null,
      endCursor: posts[posts.length - 1] ? Buffer.from(posts[posts.length - 1].id.toString()).toString('base64') : null
    },
    totalCount
  };
}
```

---

#### 2. Error Handling

```typescript
import { GraphQLError } from 'graphql';

export const resolvers = {
  Query: {
    user: async (_parent: any, args: { id: string }) => {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(args.id) }
      });
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            http: { status: 404 }
          }
        });
      }
      
      return user;
    }
  }
};
```

---

#### 3. Authentication & Authorization

```typescript
// Context with user authentication
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await startStandaloneServer(server, {
  context: async ({ req }) => {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // Verify token and get user
    const user = await verifyToken(token);
    
    return { user, prisma };
  }
});

// Protected resolver
export const resolvers = {
  Mutation: {
    createPost: async (_parent: any, args: any, context: any) => {
      // Check authentication
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      
      // Check authorization
      if (context.user.role !== 'ADMIN') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' }
        });
      }
      
      return await prisma.post.create({
        data: {
          ...args,
          authorId: context.user.id
        }
      });
    }
  }
};
```

---

### When to Use GraphQL vs REST

**Use GraphQL when:**
- Frontend needs flexible data fetching
- Multiple clients with different data needs (web, mobile, etc.)
- Reducing network requests is important
- Real-time features are needed (subscriptions)
- Strong typing is beneficial
- Complex, nested data relationships

**Use REST when:**
- Simple CRUD operations
- Caching is critical (HTTP caching)
- File uploads/downloads
- Team is unfamiliar with GraphQL
- Simpler architecture preferred

---

### Interview Questions: GraphQL

**Q: What is GraphQL and how does it differ from REST?**
A: GraphQL is a query language for APIs that allows clients to request exactly the data they need. Unlike REST with multiple endpoints, GraphQL uses a single endpoint. It eliminates over-fetching and under-fetching, provides strong typing through schemas, and supports real-time updates via subscriptions.

**Q: What is the N+1 problem in GraphQL and how do you solve it?**
A: The N+1 problem occurs when fetching a list of items (1 query) and then fetching related data for each item (N queries). For example, fetching 100 users and then their posts results in 101 queries. Solution: Use DataLoader to batch and cache requests, reducing N+1 queries to 2 queries total.

**Q: How do you implement authentication in GraphQL?**
A: Authentication is typically handled in the context function. Extract the token from request headers, verify it, and add the authenticated user to the context. Resolvers can then access `context.user` to check authentication and authorization before executing operations.

**Q: What are GraphQL subscriptions?**
A: Subscriptions enable real-time, event-based updates from server to client. They use WebSockets instead of HTTP. When data changes on the server, it pushes updates to subscribed clients. Common use cases: chat apps, live notifications, real-time dashboards.

**Q: How does GraphQL work with SQL vs MongoDB?**
A: With Prisma, GraphQL resolvers are database-agnostic - the same code works for both SQL and MongoDB. With TypeORM, SQL uses standard repositories while MongoDB requires `getMongoRepository()` and manual relationship population. MongoDB also supports aggregation pipelines directly in resolvers.

---

## Summary


### Quick Decision Matrix

| Criteria | Prisma | TypeORM |
|----------|--------|---------|
| **Type Safety** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Developer Experience** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **SQL Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **MongoDB Support** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Flexibility** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Maturity** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### Final Recommendations

**Use Prisma for:**
- Modern TypeScript projects
- Type safety is priority
- Standard CRUD operations
- SQL databases
- Startups and MVPs

**Use TypeORM for:**
- MongoDB applications
- Complex custom queries
- Legacy codebases
- Need maximum flexibility
- Enterprise applications

**Key Takeaway:**
Both ORMs are excellent choices. Prisma excels in developer experience and type safety for SQL databases, while TypeORM offers more flexibility and better MongoDB support. Choose based on your specific project requirements and team preferences.
