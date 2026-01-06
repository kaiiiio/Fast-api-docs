# TypeORM Deep Dive: Powerful ORM for TypeScript/JavaScript

TypeORM is a mature ORM that supports both TypeScript and JavaScript, with decorators, repositories, and active record patterns. This guide covers using TypeORM in Express.js applications.

## 📝 Interview-Ready Definitions

**TypeORM:** A TypeScript-based ORM that uses decorators to define database entities and supports both Active Record and Data Mapper patterns. It provides a powerful query builder and works with multiple databases (PostgreSQL, MySQL, MongoDB, etc.).

**DataSource:** The main class for database connection and configuration in TypeORM. It manages the connection pool, entities, migrations, and provides access to repositories. Think of it as the central hub for all database operations.

**Entity:** A class decorated with `@Entity()` that represents a database table. Each instance of the entity class corresponds to a row in the table.

**Repository:** A class that handles data access operations for a specific entity. It provides methods like `find()`, `save()`, `delete()` without mixing business logic with data access.

**Active Record:** A pattern where the entity class itself has methods to save, update, and delete records (e.g., `user.save()`). Good for simple applications.

**Data Mapper:** A pattern where repositories handle all database operations separately from entities. Better for complex applications with clear separation of concerns.

**Query Builder:** A programmatic way to build SQL queries using TypeScript methods instead of writing raw SQL. Provides type safety and flexibility for complex queries.

**Migration:** A version-controlled file that defines database schema changes (adding tables, columns, etc.). Allows you to track and apply database changes systematically.

**Decorator:** A TypeScript feature (e.g., `@Column()`, `@PrimaryGeneratedColumn()`) that adds metadata to classes and properties, telling TypeORM how to map them to database structures.

**Transaction:** A sequence of database operations that either all succeed or all fail together. Ensures data consistency (e.g., transferring money between accounts).

**QueryRunner:** A low-level TypeORM class that provides manual control over database operations, transactions, and schema modifications.

**Synchronize:** A TypeORM feature that automatically creates/updates database schema based on entities. **DANGER:** Never use in production as it can drop tables and lose data!

---

## What is TypeORM?

**TypeORM** is an ORM that can run in Node.js and supports:
- TypeScript and JavaScript
- Active Record and Data Mapper patterns
- Decorators for entity definition
- Multiple databases (PostgreSQL, MySQL, MongoDB, etc.)

### Why TypeORM?
users table:                posts table:
┌────┬───────────┐         ┌────┬─────────┬───────────┐
│ id │ email     │         │ id │ title   │ author_id │ ← Foreign Key
├────┼───────────┤         ├────┼─────────┼───────────┤
│ 1  │ john@...  │    ┌───→│ 1  │ Post 1  │ 1         │
│ 2  │ jane@...  │    │    │ 2  │ Post 2  │ 1         │
└────┴───────────┘    │    │ 3  │ Post 3  │ 2         │
                      │    └────┴─────────┴───────────┘
                      │
                      └─── author_id column creates the relationship
```typescript
// TypeORM: Decorator-based entities
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    email: string;
    
    @Column()
    name: string;
    
    // This is VIRTUAL - no column in database!
    // Just for TypeScript/TypeORM to load related posts
    @OneToMany(() => Post, post => post.author)
    posts: Post[];  // ← Virtual property, no actual column
}


@Entity('posts')
export class Post {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    title: string;
    
    // This creates ACTUAL column 'author_id' in database
    @ManyToOne(() => User, user => user.posts)
    @JoinColumn({ name: 'author_id' })  // ← Specifies column name
    author: User;  // Virtual property for TypeScript
    
    // This is the ACTUAL column in database
    @Column({ name: 'author_id' })
    authorId: number;  // ← Real foreign key column
}
```

**Explanation:**
TypeORM uses decorators to define entities, making the code declarative and type-safe. It supports both Active Record and Data Mapper patterns.

## Installation and Setup

### Install TypeORM

```bash
npm install typeorm reflect-metadata
npm install mysql2  # or pg for PostgreSQL

# For TypeScript
npm install -D @types/node typescript
```

### TypeScript Configuration

```json
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "strictPropertyInitialization": false
    }
}
```

### Database Connection

```typescript
// src/data-source.ts
// DataSource - Main class for database connection and configuration in TypeORM
// Manages connection pool, entities, migrations, and provides access to repositories
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Post } from './entity/Post';

export const AppDataSource = new DataSource({
    type: 'postgres',  // or 'mysql', 'mongodb'
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'mydb',
    entities: [User, Post],
    synchronize: false,  // Don't use in production!
    logging: true
});

// Initialize connection
AppDataSource.initialize()
    .then(() => console.log('Database connected'))
    .catch(error => console.error('Connection error:', error));
```

## Entity Definition

### Basic Entity

```typescript
// src/entity/User.ts
// Entity - Decorator that marks a class as a database table
// PrimaryGeneratedColumn - Auto-incrementing primary key column
// Column - Decorator for regular database columns
// CreateDateColumn - Automatically sets timestamp when record is created
// UpdateDateColumn - Automatically updates timestamp when record is modified
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ unique: true })
    email: string;
    
    @Column()
    name: string;
    
    @Column({ nullable: true })
    phone: string;
    
    @Column({ default: true })
    isActive: boolean;
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
}
```

### Entity with Relations

```typescript
// src/entity/Post.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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
    // JoinColumn - Specifies the foreign key column name in the database
    // Without this, TypeORM would default to 'authorId' instead of 'author_id'
    @JoinColumn({ name: 'author_id' })
    author: User;
    
    @Column({ name: 'author_id' })
    authorId: number;
}
```

### Many-to-Many Relations

```typescript
// src/entity/User.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Role } from './Role';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    email: string;
    
    @ManyToMany(() => Role)
    @JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
    })
    roles: Role[];
}
```

## Repository Pattern

### Using Repository

```typescript
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';

// Get repository
const userRepository = AppDataSource.getRepository(User);

// CRUD operations
app.get('/users', async (req, res) => {
    const users = await userRepository.find();
    res.json(users);
});

app.get('/users/:id', async (req, res) => {
    const user = await userRepository.findOne({
        where: { id: parseInt(req.params.id) }
    });
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
});

app.post('/users', async (req, res) => {
    const user = userRepository.create(req.body);
    const result = await userRepository.save(user);
    res.status(201).json(result);
});

app.put('/users/:id', async (req, res) => {
    const user = await userRepository.findOne({
        where: { id: parseInt(req.params.id) }
    });
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    userRepository.merge(user, req.body);
    const result = await userRepository.save(user);
    res.json(result);
});

app.delete('/users/:id', async (req, res) => {
    const result = await userRepository.delete(req.params.id);
    if (result.affected === 0) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
});
```

## Query Builder

### Complex Queries

```typescript
// Query builder for complex queries
const users = await userRepository
    .createQueryBuilder('user')
    .where('user.email LIKE :email', { email: '%@example.com%' })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .orderBy('user.createdAt', 'DESC')
    .take(10)
    .skip(20)
    .getMany();

// With relations
const users = await userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.posts', 'post')
    .where('post.published = :published', { published: true })
    .getMany();

// Aggregations
const stats = await userRepository
    .createQueryBuilder('user')
    .select('COUNT(user.id)', 'count')
    .addSelect('AVG(user.age)', 'avgAge')
    .getRawOne();
```

## Active Record Pattern

### Using Active Record

```typescript
// Entity extends BaseEntity
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    email: string;
    
    @Column()
    name: string;
    
    // Instance methods
    static async findByEmail(email: string): Promise<User | null> {
        return this.findOne({ where: { email } });
    }
}

// Use Active Record
const user = await User.findOne({ where: { id: 1 } });
await user.save();

// Or static methods
const user = await User.findByEmail('john@example.com');
```

## Transactions

### Using Transactions

```typescript
// Transaction with query runner
// QueryRunner - Provides low-level control over database operations
// Allows manual transaction management, raw queries, and schema modifications
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

// Or using transaction method
// transaction() - Higher-level API for transactions, automatically handles commit/rollback
// 'manager' is an EntityManager scoped to this transaction
await AppDataSource.transaction(async (manager) => {
    const user = manager.create(User, { email: 'john@example.com', name: 'John' });
    await manager.save(user);
    
    const post = manager.create(Post, { title: 'My Post', authorId: user.id });
    await manager.save(post);
});
```

## Real-World Examples

### Example 1: User Management

```typescript
// routes/users.ts
import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

router.get('/', async (req, res) => {
    const users = await userRepository.find({
        relations: ['posts'],
        order: { createdAt: 'DESC' }
    });
    res.json(users);
});

router.get('/:id', async (req, res) => {
    const user = await userRepository.findOne({
        where: { id: parseInt(req.params.id) },
        relations: ['posts', 'roles']
    });
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
});

router.post('/', async (req, res) => {
    try {
        const user = userRepository.create(req.body);
        const result = await userRepository.save(user);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
```

### Example 2: Complex Query

```typescript
// Get users with post statistics
router.get('/stats', async (req, res) => {
    const users = await userRepository
        // createQueryBuilder - Creates a SQL query builder for complex queries
        // 'user' is the alias used to reference this table in the query
        .createQueryBuilder('user')
        .leftJoin('user.posts', 'post')
        .select('user.id', 'userId')
        .addSelect('user.name', 'userName')
        .addSelect('COUNT(post.id)', 'postCount')
        .addSelect('MAX(post.createdAt)', 'lastPostDate')
        .groupBy('user.id')
        .having('COUNT(post.id) > :minPosts', { minPosts: 5 })
        .getRawMany();
    
    res.json(users);
});
```

## Migrations

### Generate Migration

```bash
# Generate migration
npx typeorm migration:generate -n AddPhoneToUsers

# Run migrations
npx typeorm migration:run

# Revert migration
npx typeorm migration:revert
```

### Migration File

```typescript
// migrations/1234567890-AddPhoneToUsers.ts
// MigrationInterface - Interface that all migration classes must implement
// QueryRunner - Provides methods to execute SQL and modify database schema
// TableColumn - Class representing a database column for schema modifications
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhoneToUsers1234567890 implements MigrationInterface {
    // up() - Defines changes to apply when running migration (forward)
    // This method is called when you run 'npm run typeorm migration:run'
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
```

## Best Practices

1. **Use Repository Pattern**: Prefer repository over active record for complex apps
2. **Type Safety**: Use TypeScript for full type safety
3. **Migrations**: Always use migrations, never synchronize in production
4. **Connection Pooling**: Configure connection pool appropriately
5. **Query Optimization**: Use query builder for complex queries

## Summary

**TypeORM Deep Dive:**

1. **Purpose**: Powerful ORM with TypeScript support
2. **Patterns**: Repository and Active Record patterns
3. **Features**: Decorators, relations, migrations, query builder
4. **Best Practice**: Use TypeScript, repository pattern, migrations
5. **Databases**: Supports PostgreSQL, MySQL, MongoDB, and more

**Key Takeaway:**
TypeORM is a powerful ORM that supports both TypeScript and JavaScript. It uses decorators to define entities and supports both Repository and Active Record patterns. TypeORM provides excellent TypeScript support, migrations, and a powerful query builder. Use TypeORM for type-safe database access with decorators.

**TypeORM Features:**
- Decorator-based entities
- Repository and Active Record patterns
- TypeScript support
- Migrations
- Query builder

**Next Steps:**
- Learn [Prisma ORM](prisma_orm_deep_dive.md) for modern alternative
- Study [Sequelize Deep Dive](sequelize_deep_dive.md) for traditional ORM
- Master [Relationships](relationships_explained.md) for relation patterns

---

## 🎯 Interview Questions: TypeORM

### Q1: Explain TypeORM's Repository vs Active Record patterns. When would you use each?

**Answer:**

**Active Record Pattern:**

```typescript
// Entity extends BaseEntity
@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    email: string;
    
    // Methods on entity
    async findOrders() {
        return await Order.find({ where: { userId: this.id } });
    }
}

// Usage
const user = await User.findOne({ where: { id: 1 } });
const orders = await user.findOrders();  // Method on entity
```

**Repository Pattern:**

```typescript
// Entity doesn't extend BaseEntity
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    email: string;
}

// Repository for data access
const userRepository = dataSource.getRepository(User);

// Usage
const user = await userRepository.findOne({ where: { id: 1 } });
const orders = await orderRepository.find({ where: { userId: user.id } });
```

**Comparison:**

| Aspect | Active Record | Repository |
|--------|---------------|------------|
| **Complexity** | Simple | More structured |
| **Testability** | Harder | Easier (mock repository) |
| **Separation** | Business logic in entity | Business logic in service |
| **Use Case** | Small apps | Large, complex apps |

**When to Use:**

```
Active Record:
├─ Small applications
├─ Simple CRUD operations
└─ Rapid prototyping

Repository:
├─ Large applications
├─ Complex business logic
├─ Testability important
└─ Clean architecture
```

---

### Q2: How does TypeORM handle migrations and schema synchronization?

**Answer:**

**Migrations:**

```typescript
// Generate migration
npm run typeorm migration:generate -- -n AddUserTable

// Migration file
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

// Run migrations
npm run typeorm migration:run
npm run typeorm migration:revert
```

**Schema Synchronization:**

```typescript
// ❌ Never use in production
// synchronize() - Automatically creates/updates database schema based on entities
// DANGER: Can drop tables and lose data! Only use in development
// In production, always use migrations for controlled schema changes
await dataSource.synchronize();  // Auto-creates/updates schema

// ✅ Use migrations instead
// Generate from entities
npm run typeorm migration:generate -- -n MigrationName
```

---

## Summary

These interview questions cover:
- ✅ Repository vs Active Record patterns
- ✅ TypeORM migrations and schema management
- ✅ When to use TypeORM
- ✅ Best practices

Master these for senior-level interviews focusing on TypeORM and ORM patterns.

