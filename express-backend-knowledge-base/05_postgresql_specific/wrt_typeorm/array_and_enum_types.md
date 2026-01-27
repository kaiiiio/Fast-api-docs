# Array and Enum Types: PostgreSQL-Specific Data Types in TypeORM

PostgreSQL treats arrays and enums as first-class citizens. This guide explains how to leverage these powerful types using TypeORM in an Express.js environment to ensure data integrity and performance.

## 📝 Interview-Ready Definitions  --- IMP

**Enum (Enumerated Type):** A data type that comprises a static, ordered set of values. In PostgreSQL, this is a distinct schema object that prevents invalid data from entering the column.

**Native Array Type:** A PostgreSQL feature that allows a single column to store a multidimensional array of variable length. This is technically different from a "simple-array" which is a TypeORM-simulated array using comma-separated strings.

**ANY Operator:** A PostgreSQL operator used in the `WHERE` clause to check if a value matches any element in an array.

---

## 1. PostgreSQL Arrays in TypeORM

Arrays are ideal for fields with multiple values that don't require complex relationships, such as `tags`, `roles`, or `categories`.

### Entity Definition

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    // Native PostgreSQL array of strings
    @Column("text", { array: true, default: '{}' })
    roles: string[];

    // Native PostgreSQL array of integers
    @Column("integer", { array: true, nullable: true })
    luckyNumbers: number[];
}
```

### Querying Arrays

```typescript
const userRepo = AppDataSource.getRepository(User);

// 1. Find users who have the 'admin' role (ANY operator)
const admins = await userRepo
    .createQueryBuilder("user")
    .where(":role = ANY(user.roles)", { role: "admin" })
    .getMany();

// 2. Find users who have EXACTLY ['user', 'editor'] roles
const editors = await userRepo.find({
    where: {
        roles: ['user', 'editor']
    }
});

// 3. Array Overlap (Check if user has ANY of the specified roles)
const privileged = await userRepo
    .createQueryBuilder("user")
    .where("user.roles && :roles", { roles: ['admin', 'super-user'] })
    .getMany();
```

---

## 2. PostgreSQL Enums in TypeORM

Enums are the best way to represent a fixed set of states (e.g., Order Status, User Gender).

### Defining the Enum

```typescript
export enum OrderStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}

@Entity()
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: "enum",
        enum: OrderStatus,
        default: OrderStatus.PENDING
    })
    status: OrderStatus;
}
```

### Usage

```typescript
// Saving an order
await orderRepo.save({
    status: OrderStatus.SHIPPED
});

// TypeORM automatically handles validation. 
// Trying to save a string NOT in the enum will result in a database-level error.
```

---

## 3. Best Practices  --- IMP

1. **Use Native Arrays only for simple lists:** If you need to store properties *about* an item in the list (e.g., when a tag was added), use a normalized Many-to-Many relationship instead.
2. **PostgreSQL Native Enums:** TypeORM creates native PostgreSQL enum types. Remember that adding a value to an enum in production requires a specific migration strategy (see Q2).
3. **Indexing:** Use **GIN indexes** for array columns if you plan to search them frequently using the overlap (`&&`) or contains (`@>`) operators.
4. **Prefer Enums over Strings:** For statuses, enums provide much better data integrity and slightly better performance than `VARCHAR`.

---

## 🎯 Interview Questions: PostgreSQL Types

### Q1: When would you use a PostgreSQL Array instead of a JOINed table?

**Answer:**

Use an **Array** when the data is:
1. **Simple and Atomic:** No additional metadata is needed for the items (e.g., just a list of tags).
2. **Accessed Together:** You always fetch the entire list with the parent object.
3. **Low Cardinality:** The list is typically short (e.g., < 100 items).

Use a **JOINed Table (Normalization)** when:
1. **Metadata Needed:** You need to store "date_added" or "created_by" for each item.
2. **Independent Access:** You need to query the items themselves (e.g., "List all tags used across the platform").
3. **High Cardinality:** The list can grow very large.

### Q2: How do you handle adding a new value to a PostgreSQL Enum in production?

**Answer:**

Adding a value to a PostgreSQL enum cannot be done inside a transaction in some versions (like v12 and below). The correct SQL command is:

```sql
ALTER TYPE order_status_enum ADD VALUE 'refunded' AFTER 'cancelled';
```

In TypeORM migrations, you must wrap this in a `try...catch` or run it outside the main migration transaction if your database requires it. It is also important to remember that enum values cannot be easily deleted in PostgreSQL; you would have to drop and recreate the type.

### Q3: What is the benefit of using `ARRAY` with a GIN index?

**Answer:**

A standard B-tree index cannot effectively index the individual elements inside an array. If you query `WHERE 'admin' = ANY(roles)`, a B-tree index will be ignored. A **GIN (Generalized Inverted Index)** indexes the *elements* themselves. This allows for near-instant verification of whether an array contains specific values or if two arrays overlap, which is critical for tags and permissions systems.

---

## Summary

1. **Native Arrays** are highly efficient for simple metadata like tags or roles.
2. **Enums** ensure that status fields remain consistent and type-safe.
3. **Query Builder** is often required for advanced array operators (`&&`, `@>`, `ANY`).
4. **GIN Indexes** are essential for making array searches fast at scale.
