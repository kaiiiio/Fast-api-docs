# Database Migration Tools: Managing Schema Changes

Migration tools help you version control your database schema, apply changes safely, and rollback when needed. This guide covers popular migration tools and best practices.

## What are Database Migrations?

**Database migrations** are versioned scripts that:
- Define schema changes (CREATE, ALTER, DROP)
- Can be applied (upgrade) or reversed (downgrade)
- Track which migrations have been applied
- Enable team collaboration on schema changes

**Benefits:**
- Version control for database schema
- Reproducible deployments
- Rollback capability
- Team synchronization

## Popular Migration Tools

### 1. Alembic (Python/SQLAlchemy)

**Best for:** Python applications using SQLAlchemy

#### Installation

```bash
pip install alembic
```

#### Setup

```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Add user table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

#### Configuration (alembic/env.py)

```python
from app.core.config import settings
from app.models import Base

# Set metadata for autogenerate: Alembic compares models to database.
target_metadata = Base.metadata

# Database URL: Remove async driver (Alembic uses sync connection).
config.set_main_option(
    "sqlalchemy.url",
    settings.DATABASE_URL.replace("+asyncpg", "")
)
```

#### Migration File Example

```python
# alembic/versions/001_add_users_table.py
"""Add users table

Revision ID: 001
Revises: 
Create Date: 2024-11-30 10:00:00
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create table: Schema change in upgrade function.
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    # Create index: Add indexes for performance.
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

def downgrade():
    # Reversible: Always provide downgrade (opposite order).
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
```

### 2. Sequelize Migrations (Node.js)

**Best for:** Node.js applications using Sequelize ORM

#### Installation

```bash
npm install sequelize-cli --save-dev
```

#### Setup

```bash
# Initialize Sequelize
npx sequelize-cli init

# Create migration
npx sequelize-cli migration:generate --name add-users-table

# Run migrations
npx sequelize-cli db:migrate

# Rollback
npx sequelize-cli db:migrate:undo
```

#### Migration File Example

```javascript
// migrations/20241130100000-add-users-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create table: Schema change in up function.
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Create index: Add indexes for performance.
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'idx_users_email'
    });
  },

  async down(queryInterface, Sequelize) {
    // Reversible: Always provide down function (opposite order).
    await queryInterface.removeIndex('users', 'idx_users_email');
    await queryInterface.dropTable('users');
  }
};
```

### 3. Prisma Migrate (Node.js)

**Best for:** Node.js applications using Prisma ORM

#### Setup

```bash
# Initialize Prisma
npx prisma init

# Create migration
npx prisma migrate dev --name add_users_table

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

#### Schema Definition (schema.prisma)

```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique @db.VarChar(255)
  name      String   @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("users")
}
```

#### Migration Files

Prisma auto-generates SQL migration files:

```sql
-- migrations/20241130100000_add_users_table/migration.sql
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

### 4. Flyway (Java/Any Language)

**Best for:** Java applications, but works with any language

#### Setup

```bash
# Download Flyway
wget https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/9.0.0/flyway-commandline-9.0.0-linux-x64.tar.gz

# Create migration file
# V1__Create_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Run migrations
flyway migrate
```

#### Naming Convention

```
V{version}__{description}.sql
V1__Create_users_table.sql
V2__Add_orders_table.sql
V3__Add_indexes.sql
```

### 5. Liquibase (Java/Any Language)

**Best for:** Complex migrations, XML/JSON/YAML support

#### Setup

```bash
# Download Liquibase
# Create changelog file
```

#### Changelog Example (XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">
    
    <changeSet id="1" author="developer">
        <createTable tableName="users">
            <column name="id" type="INTEGER" autoIncrement="true">
                <constraints primaryKey="true"/>
            </column>
            <column name="email" type="VARCHAR(255)">
                <constraints nullable="false" unique="true"/>
            </column>
            <column name="name" type="VARCHAR(100)">
                <constraints nullable="false"/>
            </column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="CURRENT_TIMESTAMP">
                <constraints nullable="false"/>
            </column>
        </createTable>
    </changeSet>
</databaseChangeLog>
```

## Migration Best Practices

### 1. Always Review Auto-Generated Migrations

```python
# ❌ Bad: Blindly accept autogenerate
alembic revision --autogenerate -m "Add column"
# Always review and edit!

# ✅ Good: Review and edit
# 1. Generate migration
alembic revision --autogenerate -m "Add phone column"

# 2. Review generated file
# 3. Add missing constraints, indexes
# 4. Test migration
```

### 2. Write Reversible Migrations

```python
# ✅ Good: Reversible migration
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))
    op.create_index('ix_users_phone', 'users', ['phone'])

def downgrade():
    # Reverse order: Drop index before column
    op.drop_index('ix_users_phone', table_name='users')
    op.drop_column('users', 'phone')
```

### 3. Separate Schema and Data Migrations

```python
# Migration 1: Schema change
def upgrade():
    op.add_column('users', sa.Column('full_name', sa.String(200), nullable=True))

# Migration 2: Data migration (separate)
def upgrade():
    connection = op.get_bind()
    connection.execute(
        "UPDATE users SET full_name = first_name || ' ' || last_name"
    )
```

### 4. Handle Production Data Carefully

```python
# Adding NOT NULL column to existing table
def upgrade():
    # Step 1: Add nullable column
    op.add_column('users', sa.Column('status', sa.String(20), nullable=True))
    
    # Step 2: Populate existing rows
    op.execute("UPDATE users SET status = 'active' WHERE status IS NULL")
    
    # Step 3: Make NOT NULL (in separate migration for safety)
    # op.alter_column('users', 'status', nullable=False)
```

### 5. Use Transactions

```python
# Alembic wraps migrations in transactions by default
def upgrade():
    op.create_table('orders', ...)
    op.create_table('order_items', ...)
    # Both succeed or both fail
```

## Migration Workflow

### Development Workflow

```bash
# 1. Make model changes
# Edit models/user.py

# 2. Generate migration
alembic revision --autogenerate -m "Add user phone"

# 3. Review migration file
# Edit if needed

# 4. Test migration
alembic upgrade head
alembic downgrade -1
alembic upgrade head

# 5. Commit to version control
git add alembic/versions/
git commit -m "Add user phone column"
```

### Production Workflow

```bash
# 1. Backup database
pg_dump mydb > backup.sql

# 2. Review migration
# Check migration file

# 3. Apply migration
alembic upgrade head

# 4. Verify
# Check application works

# 5. Monitor
# Watch for errors
```

## Common Migration Patterns

### Pattern 1: Adding Column

```python
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))
    op.create_index('ix_users_phone', 'users', ['phone'])

def downgrade():
    op.drop_index('ix_users_phone', table_name='users')
    op.drop_column('users', 'phone')
```

### Pattern 2: Renaming Column

```python
def upgrade():
    op.rename_column('users', 'old_name', 'new_name')

def downgrade():
    op.rename_column('users', 'new_name', 'old_name')
```

### Pattern 3: Changing Column Type

```python
def upgrade():
    op.alter_column('users', 'age',
        type_=sa.Integer(),
        existing_type=sa.String()
    )

def downgrade():
    op.alter_column('users', 'age',
        type_=sa.String(),
        existing_type=sa.Integer()
    )
```

### Pattern 4: Adding Foreign Key

```python
def upgrade():
    op.add_column('orders', sa.Column('user_id', sa.Integer(), nullable=False))
    op.create_foreign_key(
        'fk_orders_user',
        'orders', 'users',
        ['user_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_orders_user', 'orders', type_='foreignkey')
    op.drop_column('orders', 'user_id')
```

## Migration Tools Comparison

| Tool | Language | Auto-Generate | Best For |
|------|----------|---------------|----------|
| **Alembic** | Python | ✅ Yes | SQLAlchemy projects |
| **Sequelize** | Node.js | ✅ Yes | Sequelize ORM |
| **Prisma** | Node.js | ✅ Yes | Prisma ORM |
| **Flyway** | Any | ❌ No | Java, simple SQL |
| **Liquibase** | Any | ❌ No | Complex migrations |

## Best Practices

1. **Review Auto-Generated**: Always review and edit
2. **Write Reversible**: Always provide downgrade
3. **Separate Concerns**: Schema vs data migrations
4. **Test Migrations**: Test upgrade and downgrade
5. **Backup First**: Always backup before production migrations
6. **Version Control**: Commit migrations to git
7. **Document Changes**: Clear migration messages

## Summary

**Migration Tools Essentials:**

1. **Purpose**: Version control database schema
2. **Tools**: Alembic, Sequelize, Prisma, Flyway, Liquibase
3. **Workflow**: Generate → Review → Test → Apply
4. **Best Practices**: Reversible, reviewed, tested
5. **Production**: Backup first, test thoroughly

**Key Takeaway:**
Migration tools are essential for managing database schema changes. They enable version control, team collaboration, and safe deployments. Always review auto-generated migrations, write reversible migrations, and test thoroughly before production.

**Next Steps:**
- Learn [Versioned Migrations](versioned_migrations.md) for detailed workflow
- Study [Production Best Practices](production_best_practices.md) for deployment
- Master [Rollbacks](rollbacks.md) for error recovery

