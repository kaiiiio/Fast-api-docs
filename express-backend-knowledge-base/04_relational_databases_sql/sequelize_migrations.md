# Sequelize Migrations: Managing Database Schema Changes

Sequelize migrations track and apply database schema changes systematically. They're essential for version control, team collaboration, and production deployments.

## What are Sequelize Migrations?

**Sequelize migrations** are files that contain SQL statements to modify database schema. They allow you to version control database changes and apply them consistently across environments.

### Basic Concept

```javascript
// Migration file: 20230101000000-create-users.js
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('users');
    }
};
```

**Explanation:**
Migrations have `up` (apply changes) and `down` (rollback changes) functions. The `up` function creates the table, and `down` drops it.

## Creating Migrations

### Generate Migration

```bash
# Generate migration file
npx sequelize-cli migration:generate --name create-users

# Creates: migrations/20230101000000-create-users.js
```

### Migration File Structure

```javascript
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Apply changes
    },

    async down(queryInterface, Sequelize) {
        // Rollback changes
    }
};
```

## Common Migration Operations

### Creating Tables

```javascript
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('users');
    }
};
```

### Adding Columns

```javascript
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'phone', {
            type: Sequelize.STRING,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'phone');
    }
};
```

### Removing Columns

```javascript
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'phone');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'phone', {
            type: Sequelize.STRING,
            allowNull: true
        });
    }
};
```

### Adding Indexes

```javascript
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addIndex('users', ['email'], {
            name: 'idx_users_email',
            unique: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('users', 'idx_users_email');
    }
};
```

### Creating Foreign Keys

```javascript
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('orders', 'user_id', {
            type: Sequelize.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('orders', 'user_id');
    }
};
```

## Real-World Examples

### Example 1: Complete E-Commerce Schema

```javascript
// 20230101000000-create-users.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            password_hash: {
                type: Sequelize.STRING,
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('users', ['email']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('users');
    }
};

// 20230102000000-create-orders.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('orders', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            total: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            status: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'pending'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('orders', ['user_id']);
        await queryInterface.addIndex('orders', ['status']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('orders');
    }
};
```

### Example 2: Adding Column with Data Migration

```javascript
// 20230103000000-add-phone-to-users.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add column
        await queryInterface.addColumn('users', 'phone', {
            type: Sequelize.STRING,
            allowNull: true
        });

        // Migrate existing data (if needed)
        await queryInterface.sequelize.query(`
            UPDATE users 
            SET phone = '' 
            WHERE phone IS NULL
        `);

        // Make NOT NULL after data migration
        await queryInterface.changeColumn('users', 'phone', {
            type: Sequelize.STRING,
            allowNull: false
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'phone');
    }
};
```

### Example 3: Renaming Column

```javascript
// 20230104000000-rename-username-to-name.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.renameColumn('users', 'username', 'name');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.renameColumn('users', 'name', 'username');
    }
};
```

## Running Migrations

### Apply Migrations

```bash
# Run all pending migrations
npx sequelize-cli db:migrate

# Run specific migration
npx sequelize-cli db:migrate --to 20230102000000-create-orders.js
```

### Rollback Migrations

```bash
# Rollback last migration
npx sequelize-cli db:migrate:undo

# Rollback all migrations
npx sequelize-cli db:migrate:undo:all

# Rollback to specific migration
npx sequelize-cli db:migrate:undo:all --to 20230101000000-create-users.js
```

## Migration Status

### Check Migration Status

```bash
# View migration status
npx sequelize-cli db:migrate:status
```

### Migration Table

```sql
-- Sequelize creates a table to track migrations
SELECT * FROM SequelizeMeta;
```

## Best Practices

### 1. Make Migrations Reversible

```javascript
// ✅ Good: Reversible migration
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'phone', {
            type: Sequelize.STRING,
            allowNull: true
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'phone');
    }
};
```

### 2. Test Migrations

```bash
# Test on development database first
# 1. Apply migration
npx sequelize-cli db:migrate

# 2. Verify changes
# 3. Rollback migration
npx sequelize-cli db:migrate:undo

# 4. Verify rollback
# 5. Re-apply migration
npx sequelize-cli db:migrate
```

### 3. Keep Migrations Small

```javascript
// ✅ Good: Small, focused migration
// Migration: add-phone-to-users.js
// Only adds phone column

// ❌ Bad: Large migration
// Migration: major-changes.js
// Creates 5 tables, adds 10 columns, creates 20 indexes
// Hard to review, test, and rollback
```

### 4. Never Edit Applied Migrations

```javascript
// ❌ Bad: Edit applied migration
// Migration 001 was already applied
// Don't edit it!

// ✅ Good: Create new migration
// Migration 003: Fix issue from migration 001
```

## Common Mistakes

### ❌ No Down Migration

```javascript
// ❌ Bad: No rollback capability
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'phone', {
            type: Sequelize.STRING
        });
    }
    // Missing: down function
};

// ✅ Good: Has rollback
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'phone', {
            type: Sequelize.STRING
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'phone');
    }
};
```

## Summary

**Sequelize Migrations:**

1. **Purpose**: Track and apply database schema changes
2. **Structure**: `up` (apply) and `down` (rollback) functions
3. **Operations**: Create tables, add/remove columns, indexes, foreign keys
4. **Best Practices**: Reversible, tested, small, never edit applied
5. **Commands**: `db:migrate` (apply), `db:migrate:undo` (rollback)

**Key Takeaway:**
Sequelize migrations manage database schema changes systematically. Each migration has `up` (apply) and `down` (rollback) functions. Keep migrations small and focused, make them reversible, and test thoroughly before production. Never edit applied migrations—create new ones instead.

**Migration Workflow:**
- Generate migration file
- Write up and down functions
- Test on development
- Apply to production
- Track in version control

**Next Steps:**
- Learn [Sequelize Deep Dive](sequelize_deep_dive.md) for ORM usage
- Study [Relationships](relationships_explained.md) for relationship migrations
- Master [CRUD with Repository Pattern](crud_with_repository_pattern.md) for data access

