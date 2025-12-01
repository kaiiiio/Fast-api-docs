# TypeORM Deep Dive: Powerful ORM for TypeScript/JavaScript

TypeORM is a mature ORM that supports both TypeScript and JavaScript, with decorators, repositories, and active record patterns. This guide covers using TypeORM in Express.js applications.

## What is TypeORM?

**TypeORM** is an ORM that can run in Node.js and supports:
- TypeScript and JavaScript
- Active Record and Data Mapper patterns
- Decorators for entity definition
- Multiple databases (PostgreSQL, MySQL, MongoDB, etc.)

### Why TypeORM?

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
    
    @OneToMany(() => Post, post => post.author)
    posts: Post[];
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
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

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

