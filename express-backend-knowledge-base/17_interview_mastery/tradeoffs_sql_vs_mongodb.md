# Tradeoffs SQL vs MongoDB for AI Apps: Interview Guide

Understanding when to use SQL vs MongoDB for AI applications is crucial for system design interviews. This guide covers tradeoffs and decision criteria.

## SQL (PostgreSQL) Advantages

**Strengths:**
- ACID transactions
- Complex queries and joins
- Mature ecosystem
- Vector search (pgvector)
- Strong consistency

**Best For:**
- Structured data
- Complex relationships
- Transactional requirements
- Vector embeddings (pgvector)
- Analytics and reporting

## MongoDB Advantages

**Strengths:**
- Flexible schema
- Horizontal scaling
- Document model
- Fast writes
- JSON-like structure

**Best For:**
- Unstructured/variable data
- Rapid iteration
- High write throughput
- Document storage
- Simple queries

## Decision Framework

### Use SQL When:
- Need ACID transactions
- Complex relationships
- Vector search needed
- Strong consistency required
- Analytics and reporting

### Use MongoDB When:
- Flexible schema needed
- High write throughput
- Simple queries
- Horizontal scaling critical
- Document model fits

## Hybrid Approach

**Use Both:**
- SQL for structured data (users, orders)
- MongoDB for unstructured data (logs, events)
- SQL for vector search (pgvector)
- MongoDB for flexible documents

## Summary

**SQL vs MongoDB Tradeoffs:**

1. **SQL**: ACID, complex queries, relationships, vector search
2. **MongoDB**: Flexible schema, scaling, simple queries
3. **Choose SQL**: Structured data, transactions, vector search
4. **Choose MongoDB**: Flexible data, high writes, scaling
5. **Hybrid**: Use both for different needs

**Key Takeaway:**
SQL excels at structured data, complex queries, and ACID transactions. MongoDB excels at flexible schemas and horizontal scaling. For AI apps, use SQL with pgvector for vector search. Consider hybrid approaches for different data types.

**Decision Strategy:**
- Structured data → SQL
- Flexible data → MongoDB
- Vector search → SQL (pgvector)
- High writes → MongoDB
- Complex queries → SQL

**Next Steps:**
- Learn [Choosing Database Type](../03_data_layer_fundamentals/choosing_database_type.md) for selection
- Study [MongoDB Setup](../06_nosql_mongodb/mongoose_setup_and_basics.md) for NoSQL
- Master [pgvector](../05_postgresql_specific/pgvector_for_embeddings.md) for vectors

