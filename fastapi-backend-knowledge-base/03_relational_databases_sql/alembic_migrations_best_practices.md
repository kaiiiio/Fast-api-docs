# Alembic Migrations Best Practices

Alembic is SQLAlchemy's database migration tool. This guide covers best practices for managing database schema changes.

## Basic Setup

### Initialization

```bash
# Initialize Alembic
alembic init alembic

# Create initial migration from models
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Configuration (alembic/env.py)

```python
from app.core.config import settings
from app.models import Base

# Set metadata for autogenerate
target_metadata = Base.metadata

# Database URL from config
config.set_main_option(
    "sqlalchemy.url",
    settings.DATABASE_URL.replace("+asyncpg", "")  # Remove async driver
)

def run_migrations_online():
    # Use async engine
    connectable = create_async_engine(settings.DATABASE_URL)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()
```

## Migration Best Practices

### 1. Review Auto-Generated Migrations

```python
# ❌ Bad: Blindly accept autogenerate
alembic revision --autogenerate -m "Add user table"
# Always review and edit the generated migration!

# ✅ Good: Review and edit
def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

def downgrade():
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
```

### 2. Always Write Reversible Migrations

```python
# ✅ Good: Reversible
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))
    op.create_index('ix_users_phone', 'users', ['phone'])

def downgrade():
    op.drop_index('ix_users_phone', table_name='users')
    op.drop_column('users', 'phone')
```

### 3. Handle Data Migrations Separately

```python
# Migration 1: Schema change
def upgrade():
    op.add_column('users', sa.Column('full_name', sa.String(), nullable=True))

def downgrade():
    op.drop_column('users', 'full_name')

# Migration 2: Data migration
def upgrade():
    # Update existing data
    connection = op.get_bind()
    connection.execute(
        "UPDATE users SET full_name = first_name || ' ' || last_name"
    )

def downgrade():
    # Revert data if needed
    pass
```

### 4. Use Transactions

```python
# Alembic wraps migrations in transactions by default
# Multiple operations succeed or fail together

def upgrade():
    op.create_table('orders', ...)
    op.create_table('order_items', ...)  # Both or neither
    op.add_column('users', ...)
```

### 5. Handle Production Data Carefully

```python
# Add column with default, then make NOT NULL
def upgrade():
    # Step 1: Add nullable column
    op.add_column('users', sa.Column('status', sa.String(), nullable=True))
    
    # Step 2: Set default for existing rows
    op.execute("UPDATE users SET status = 'active' WHERE status IS NULL")
    
    # Step 3: Make NOT NULL (separate migration for safety)
    # op.alter_column('users', 'status', nullable=False)

def downgrade():
    op.drop_column('users', 'status')
```

## Common Migration Patterns

### Adding Indexes

```python
def upgrade():
    op.create_index(
        'ix_users_email_active',
        'users',
        ['email'],
        unique=True,
        postgresql_where=sa.text('deleted_at IS NULL')  # Partial index
    )

def downgrade():
    op.drop_index('ix_users_email_active', table_name='users')
```

### Renaming Columns

```python
def upgrade():
    op.alter_column('users', 'name', new_column_name='full_name')

def downgrade():
    op.alter_column('users', 'full_name', new_column_name='name')
```

### Changing Column Types

```python
def upgrade():
    # PostgreSQL
    op.execute('ALTER TABLE users ALTER COLUMN price TYPE DECIMAL(10,2) USING price::DECIMAL')
    
    # Or using Alembic
    op.alter_column('users', 'price', type_=sa.Numeric(10, 2))

def downgrade():
    op.alter_column('users', 'price', type_=sa.Float())
```

### Adding Foreign Keys

```python
def upgrade():
    op.add_column('orders', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_orders_user_id',
        'orders',
        'users',
        ['user_id'],
        ['id']
    )

def downgrade():
    op.drop_constraint('fk_orders_user_id', 'orders', type_='foreignkey')
    op.drop_column('orders', 'user_id')
```

## Migration Organization

### Branching Strategy

```
main branch
├── migrations/
│   ├── versions/
│   │   ├── 001_initial.py
│   │   ├── 002_add_users.py
│   │   └── 003_add_orders.py
```

### Multiple Heads (Avoid)

```bash
# Detect multiple heads
alembic heads

# Merge heads
alembic merge -m "Merge user and order migrations" heads
```

## Testing Migrations

### Test Migration Up/Down

```python
# tests/test_migrations.py
import pytest
from alembic import command
from alembic.config import Config

@pytest.fixture
def alembic_cfg():
    return Config("alembic.ini")

def test_migrations_up_and_down(alembic_cfg):
    # Upgrade to head
    command.upgrade(alembic_cfg, "head")
    
    # Downgrade one step
    command.downgrade(alembic_cfg, "-1")
    
    # Upgrade again
    command.upgrade(alembic_cfg, "+1")
```

## Deployment Strategy

### Production Deployment

```bash
# 1. Backup database
pg_dump database_name > backup.sql

# 2. Review pending migrations
alembic current
alembic heads

# 3. Apply migrations
alembic upgrade head

# 4. Verify
alembic current
```

### Zero-Downtime Migrations

```python
# Strategy 1: Add nullable column
def upgrade():
    op.add_column('users', sa.Column('new_field', sa.String(), nullable=True))
    # Application code handles both old and new
    # Later: Make NOT NULL in separate migration

# Strategy 2: New table, then migrate
def upgrade():
    op.create_table('users_v2', ...)  # New table
    # Application writes to both
    # Migrate data gradually
    # Switch reads, then drop old table
```

## Best Practices Summary

1. **Always review autogenerated migrations**
2. **Write reversible downgrades**
3. **Separate schema and data migrations**
4. **Test migrations in staging first**
5. **Backup before production migrations**
6. **Use transactions (default in Alembic)**
7. **Version control migration files**
8. **Document complex migrations**
9. **Avoid breaking changes in production**
10. **Plan zero-downtime strategies**

## Summary

Alembic migrations should be:
- ✅ Reversible (downgrade works)
- ✅ Reviewed (never blindly accept autogenerate)
- ✅ Tested (in staging environment)
- ✅ Documented (complex changes explained)
- ✅ Safe (backups, transactions, zero-downtime)

Following these practices ensures smooth database schema evolution in production.

