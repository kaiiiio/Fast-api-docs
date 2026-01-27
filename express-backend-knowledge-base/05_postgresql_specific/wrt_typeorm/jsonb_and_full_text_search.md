# JSONB and Full Text Search: PostgreSQL Advanced Features in TypeORM

PostgreSQL's JSONB and full-text search capabilities allow you to combine structured relational data with flexible JSON storage and high-performance text search. This guide covers implementing these features using TypeORM in Express.js.

## 📝 Interview-Ready Definitions  --- IMP

**JSONB:** A binary-encoded version of JSON data in PostgreSQL. Unlike standard JSON, JSONB is pre-parsed, supports GIN indexing, and offers much faster querying and manipulation at the cost of slightly slower write times.

**GIN Index (Generalized Inverted Index):** The standard index type for JSONB and Full-Text Search in PostgreSQL. It index the component parts (keys and values or lexemes), allowing for high-performance searches within complex data structures.

**TSVector:** A PostgreSQL-specific data type that represents a document optimized for text search. It contains a sorted list of distinct "lexemes" (normalized words).

**TSQuery:** A PostgreSQL-specific data type that represents a search query, supporting boolean operators like AND (&), OR (|), and NOT (!).

---

## 1. Using JSONB with TypeORM

JSONB is the preferred way to store semi-structured data like product attributes, user preferences, or audit logs.

### Entity Definition

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    // JSONB column for flexible metadata
    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        color?: string;
        brand?: string;
        specs?: Record<string, any>;
        tags?: string[];
    };
}
```

### Basic Operations

```typescript
const productRepo = AppDataSource.getRepository(Product);

// Create with JSONB data
await productRepo.save({
    name: "MacBook Pro",
    metadata: {
        brand: "Apple",
        color: "Space Gray",
        specs: { ram: "16GB", ssd: "512GB" },
        tags: ["laptop", "pro", "apple"]
    }
});

// Update JSONB data (Note: TypeORM performs a full replacement)
const product = await productRepo.findOneBy({ id: 1 });
product.metadata.color = "Silver";
await productRepo.save(product);
```

---

## 2. Advanced JSONB Querying

While basic object matching works, complex JSONB operations often require the **Query Builder** or **Raw SQL**.

### Querying with Query Builder

```typescript
// Find products where brand is 'Apple'
const appleProducts = await productRepo
    .createQueryBuilder("product")
    .where("product.metadata ->> 'brand' = :brand", { brand: "Apple" })
    .getMany();

// Check if a tag exists in the tags array (?)
const proProducts = await productRepo
    .createQueryBuilder("product")
    .where("product.metadata->'tags' ? :tag", { tag: "pro" })
    .getMany();

// Check if metadata contains a specific object (@>)
const silverApple = await productRepo
    .createQueryBuilder("product")
    .where("product.metadata @> :search", { 
        search: JSON.stringify({ brand: "Apple", color: "Silver" }) 
    })
    .getMany();
```

---

## 3. Full-Text Search (FTS) in TypeORM

PostgreSQL's FTS is significantly faster than `LIKE %query%` because it uses indexes and understands word relevance.

### Creating the Search Index (Migration)

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSearchIndex1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create a GIN index on name and a 'search_content' field (if exists)
        await queryRunner.query(`
            CREATE INDEX idx_product_search 
            ON product USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX idx_product_search`);
    }
}
```

### Implementing Search in Service

```typescript
async searchProducts(query: string) {
    return await productRepo
        .createQueryBuilder("product")
        .where("to_tsvector('english', product.name) @@ plainto_tsquery('english', :query)", { query })
        .orderBy("ts_rank(to_tsvector('english', product.name), plainto_tsquery('english', :query))", "DESC")
        .getMany();
}
```

---

## 4. Best Practices  --- IMP

1. **Prefer JSONB over JSON:** Always use JSONB unless you explicitly need to preserve the exact whitespace/ordering of the input text.
2. **Indexing is Mandatory:** JSONB is slow for searching without a **GIN index**. Use `jsonb_path_ops` for even better performance on containment (`@>`) queries.
3. **Validate at Application Level:** TypeORM doesn't validate JSONB structure by default. Use libraries like **Zod** or **class-validator** before saving.
4. **Don't Overuse JSONB:** If you find yourself querying a specific JSONB key in every query, promote that key to a first-class relational column.

---

## 🎯 Interview Questions: PostgreSQL + TypeORM

### Q1: How does TypeORM handle JSONB updates? What is the performance implication?

**Answer:**

TypeORM handles JSONB updates by **fetching the entire object, modifying it in memory, and then performing a full replacement** in the database. 

**Performance Implication:** 
For very large JSONB objects, this is inefficient. If you only need to update a single nested key, it is better to use a raw query with the `jsonb_set` function to avoid the overhead of transferring the entire object over the network:

```typescript
await productRepo.query(
    "UPDATE product SET metadata = jsonb_set(metadata, '{color}', '\"Blue\"') WHERE id = $1",
    [productId]
);
```

### Q2: Explain the difference between `->` and `->>` operators. Which should be used for filtering?

**Answer:**

- **`->` (Arrow):** Returns the data as a **JSONB object/array**. Use this for further nesting or containment checks (`@>`).
- **`->>` (Double Arrow):** Returns the data as **Plain Text**. 

**Filtering Strategy:**
Use `->>` when comparing a JSONB value to a string or number in your `WHERE` clause. Use `->` when you need to chain deeper into the object or check if a key exists using the `?` operator.

### Q3: Why is GIN indexing crucial for Full-Text Search?

**Answer:**

A standard B-tree index is efficient only for exact matches or prefix searches (e.g., `text%`). It cannot handle search terms inside a sentence or word variants. A **GIN (Generalized Inverted Index)** stores a mapping of every word (lexeme) to the records containing it. This allows PostgreSQL to find results for "computing" even if the database only contains "computer," and it does so in milliseconds even across millions of rows.

---

## Summary

1. **JSONB** provides schemaless flexibility with relational power.
2. **GIN Indexes** are required for performant JSONB and text searches.
3. **Query Builder** is the safest way to execute PostgreSQL-specific JSONB operators in TypeORM.
4. **Full-Text Search** provides semantic, ranked search results far superior to `LIKE`.
