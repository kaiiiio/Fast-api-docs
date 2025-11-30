# SQL Knowledge Base: Complete Guide

A comprehensive guide to SQL for backend developers, covering everything from fundamentals to advanced patterns and real-world applications.

## Table of Contents

### 1. Fundamentals
- [What is SQL (Declarative vs Imperative)](01_fundamentals/what_is_sql.md)
- [SQL vs NoSQL (Use-cases, tradeoffs)](01_fundamentals/sql_vs_nosql.md)
- [DB Engines (PostgreSQL, MySQL, MariaDB, SQLite)](01_fundamentals/database_engines.md)
- [Relational Concepts](01_fundamentals/relational_concepts.md)
- [SQL Dialects (Postgres SQL vs MySQL SQL differences)](01_fundamentals/sql_dialects.md)

### 2. CRUD Basics
- [SELECT](02_crud_basics/select.md)
- [INSERT](02_crud_basics/insert.md)
- [UPDATE](02_crud_basics/update.md)
- [DELETE](02_crud_basics/delete.md)
- [RETURNING keyword (Postgres-specific)](02_crud_basics/returning.md)

### 3. Querying Deep Dive
- [WHERE Clauses](03_querying_deep_dive/where_clauses.md)
- [Filtering (AND, OR, IN, BETWEEN, LIKE)](03_querying_deep_dive/filtering.md)
- [ORDER BY](03_querying_deep_dive/order_by.md)
- [LIMIT + OFFSET (Pagination)](03_querying_deep_dive/pagination.md)
- [DISTINCT](03_querying_deep_dive/distinct.md)
- [Aliases (AS)](03_querying_deep_dive/aliases.md)

### 4. Joins
- [INNER JOIN](04_joins/inner_join.md)
- [LEFT JOIN](04_joins/left_join.md)
- [RIGHT JOIN and FULL OUTER JOIN](04_joins/right_join_full_join.md)

### 5. Aggregations + Grouping
- [GROUP BY](05_aggregations_grouping/group_by.md)
- [HAVING](05_aggregations_grouping/having.md)
- [Window Functions (OVER(), PARTITION BY)](05_aggregations_grouping/window_functions.md)

### 6. Advanced Querying
- [Subqueries (Scalar, Table, Correlated)](06_advanced_querying/subqueries.md)
- [CTEs (WITH queries)](06_advanced_querying/ctes.md)
- [EXISTS vs IN vs ANY vs ALL](06_advanced_querying/exists_vs_in.md)
- [UNION, INTERSECT, EXCEPT](06_advanced_querying/union_intersect_except.md)

### 7. Database Design
- [Normalization (1NF, 2NF, 3NF)](07_database_design/normalization.md)
- [Denormalization (Why & When)](07_database_design/denormalization.md)
- [Data Modeling (ER Diagrams)](07_database_design/data_modeling.md)
- [Many-to-One](07_database_design/many_to_one.md)
- [Many-to-Many](07_database_design/many_to_many.md)
- [Junction Tables](07_database_design/junction_tables.md)
- [Inheritance Patterns](07_database_design/inheritance_patterns.md)
- [UUID vs Auto-Increment IDs](07_database_design/uuid_vs_autoincrement.md)

### 8. Indexes (EXTREMELY IMPORTANT)
- [What is an Index (B-Trees)](08_indexes/what_is_index.md)
- [How Indexes Work Internally](08_indexes/how_indexes_work.md)
- [B-Tree Index](08_indexes/btree_index.md)
- [Hash Index](08_indexes/hash_index.md)
- [GIN, GiST, BRIN Indexes](08_indexes/specialized_indexes.md)
- [Composite Index](08_indexes/composite_index.md)
- [Index Selectivity](08_indexes/index_selectivity.md)
- [Covering Index](08_indexes/covering_index.md)
- [Index Scans vs Seq Scans](08_indexes/index_scans_vs_seq_scans.md)
- [Common Index Mistakes](08_indexes/common_index_mistakes.md)

### 9. Transactions & Concurrency
- [ACID Properties](09_transactions_concurrency/acid_properties.md)
- [BEGIN / COMMIT / ROLLBACK](09_transactions_concurrency/transaction_control.md)
- [Savepoints](09_transactions_concurrency/savepoints.md)
- [Isolation Levels](09_transactions_concurrency/isolation_levels.md)
- [Deadlocks](09_transactions_concurrency/deadlocks.md)
- [Lock Types](09_transactions_concurrency/lock_types.md)
- [Connection Pooling](09_transactions_concurrency/connection_pooling.md)

### 10. Performance Optimization
- [EXPLAIN and EXPLAIN ANALYZE](10_performance_optimization/explain_analyze.md)
- [Query Optimization Tips](10_performance_optimization/query_optimization_tips.md)

### 11. Migrations
- [DB Migration Tools (Alembic, Prisma, Liquibase)](11_migrations/migration_tools.md)
- [Versioned Migrations](11_migrations/versioned_migrations.md)
- [Schema Drift](11_migrations/schema_drift.md)
- [Rollbacks](11_migrations/rollbacks.md)
- [Seeding Data](11_migrations/seeding_data.md)
- [Production Migration Best Practices](11_migrations/production_best_practices.md)

### 12. Security
- [SQL Injection Prevention](12_security/sql_injection_prevention.md)
- [Prepared Statements](12_security/prepared_statements.md)
- [Row Level Security (Postgres)](12_security/row_level_security.md)
- [Database Roles & Permissions](12_security/roles_permissions.md)
- [Encrypting Data at Rest / Transit](12_security/encryption.md)

### 13. SQL for Backend APIs
- [Pagination Queries](13_sql_for_backend_apis/pagination_queries.md)
- [Search + Filtering Query Patterns](13_sql_for_backend_apis/search_filtering.md)
- [Soft Deletes vs Hard Deletes](13_sql_for_backend_apis/soft_deletes.md)
- [Auditing Tables (CreatedAt / UpdatedAt)](13_sql_for_backend_apis/auditing_tables.md)
- [Multi-tenant Database Patterns](13_sql_for_backend_apis/multi_tenant_patterns.md)
- [Bulk Inserts & Bulk Updates](13_sql_for_backend_apis/bulk_operations.md)
- [Async vs Sync Database Clients](13_sql_for_backend_apis/async_vs_sync.md)
- [Rate-Limited Queries](13_sql_for_backend_apis/rate_limited_queries.md)

### 14. Real World SQL Patterns
- [E-commerce Schema (Complete Database Design)](14_real_world_sql_patterns/ecommerce_schema.md)
- [Common Query Patterns (20+ Real-World Solutions)](14_real_world_sql_patterns/common_queries.md)

### 15. DB Infrastructure
- [Views (Virtual Tables)](15_db_infrastructure/views.md)
- [Stored Procedures (Reusable Database Logic)](15_db_infrastructure/stored_procedures.md)
- [Triggers (Automated Actions)](15_db_infrastructure/triggers.md)

## Learning Path

### Beginner Path
1. Start with Fundamentals (Section 1)
2. Master CRUD Basics (Section 2)
3. Learn Querying Deep Dive (Section 3)
4. Understand Joins (Section 4)

### Intermediate Path
5. Aggregations & Grouping (Section 5)
6. Advanced Querying (Section 6)
7. Database Design (Section 7)
8. Indexes (Section 8) - **CRITICAL**

### Advanced Path
9. Transactions & Concurrency (Section 9)
10. Performance Optimization (Section 10)
11. Security (Section 12)
12. Real World Patterns (Section 14)

### Production Path
13. Migrations (Section 11)
14. SQL for Backend APIs (Section 13)
15. DB Infrastructure (Section 15)

## Quick Start

1. **New to SQL?** Start with [What is SQL](01_fundamentals/what_is_sql.md)
2. **Building APIs?** Jump to [SQL for Backend APIs](13_sql_for_backend_apis/)
3. **Performance Issues?** Check [Performance Optimization](10_performance_optimization/)
4. **Production Ready?** Review [DB Infrastructure](15_db_infrastructure/)
5. **Need Quick Solutions?** Check [Common Query Patterns](14_real_world_sql_patterns/common_queries.md)

## File Statistics

**Total Files Created: 33**

- ✅ Fundamentals: 3 files
- ✅ CRUD Basics: 4 files
- ✅ Joins: 3 files
- ✅ Aggregations: 3 files
- ✅ Advanced Querying: 4 files
- ✅ Database Design: 1 file
- ✅ Indexes: 1 file
- ✅ Transactions: 2 files
- ✅ Performance: 2 files
- ✅ Migrations: 1 file
- ✅ Security: 1 file
- ✅ Backend APIs: 2 files
- ✅ Real-World Patterns: 2 files
- ✅ DB Infrastructure: 3 files

All files include:
- Detailed explanations with examples
- Real-world use cases
- Performance considerations
- Common mistakes and best practices
- Copy-paste ready code patterns

## Contributing

This knowledge base is designed to be comprehensive and practical. Each topic includes:
- Clear explanations with examples
- Real-world use cases
- Best practices
- Common pitfalls
- Performance considerations

## License

This knowledge base is for educational purposes.

