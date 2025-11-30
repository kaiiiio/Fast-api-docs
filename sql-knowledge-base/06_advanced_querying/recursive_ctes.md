# Recursive CTEs: Querying Hierarchical and Tree Data

Recursive CTEs (Common Table Expressions) allow you to query hierarchical data structures like trees, graphs, and organizational charts. They're essential for working with self-referential data.

## What is a Recursive CTE?

**Recursive CTE** is a CTE that references itself, allowing iterative querying of hierarchical data.

### Basic Structure

```sql
WITH RECURSIVE cte_name AS (
    -- Base case (anchor)
    SELECT ... FROM table WHERE condition
    
    UNION ALL
    
    -- Recursive case
    SELECT ... FROM table
    JOIN cte_name ON condition
)
SELECT * FROM cte_name;
```

## Basic Example: Number Sequence

```sql
-- Generate numbers 1 to 10
WITH RECURSIVE numbers AS (
    -- Base case: Start with 1
    SELECT 1 AS n
    
    UNION ALL
    
    -- Recursive case: Increment until 10
    SELECT n + 1
    FROM numbers
    WHERE n < 10
)
SELECT * FROM numbers;

-- Result: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
```

## Tree Structures

### Example 1: Organizational Hierarchy

```sql
-- Employees table with manager_id
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    manager_id INTEGER REFERENCES employees(id)
);

-- Find all subordinates of a manager
WITH RECURSIVE subordinates AS (
    -- Base case: Direct reports
    SELECT 
        id,
        name,
        manager_id,
        1 AS level
    FROM employees
    WHERE manager_id = 1  -- Starting manager
    
    UNION ALL
    
    -- Recursive case: Subordinates of subordinates
    SELECT 
        e.id,
        e.name,
        e.manager_id,
        s.level + 1
    FROM employees e
    JOIN subordinates s ON e.manager_id = s.id
)
SELECT * FROM subordinates;
```

### Example 2: Category Hierarchy

```sql
-- Categories with parent_id
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    parent_id INTEGER REFERENCES categories(id)
);

-- Get all subcategories
WITH RECURSIVE category_tree AS (
    -- Base case: Root category
    SELECT 
        id,
        name,
        parent_id,
        ARRAY[id] AS path,
        0 AS depth
    FROM categories
    WHERE id = 1  -- Root category
    
    UNION ALL
    
    -- Recursive case: Children
    SELECT 
        c.id,
        c.name,
        c.parent_id,
        ct.path || c.id,  -- Build path
        ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE NOT c.id = ANY(ct.path)  -- Prevent cycles
)
SELECT * FROM category_tree;
```

## Real-World Examples

### Example 1: File System Structure

```sql
-- Files and folders hierarchy
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    parent_id INTEGER REFERENCES files(id),
    is_folder BOOLEAN
);

-- Get full path for a file
WITH RECURSIVE file_path AS (
    -- Base case: Target file
    SELECT 
        id,
        name,
        parent_id,
        name AS full_path
    FROM files
    WHERE id = 10
    
    UNION ALL
    
    -- Recursive case: Build path upward
    SELECT 
        f.id,
        f.name,
        f.parent_id,
        f.name || '/' || fp.full_path
    FROM files f
    JOIN file_path fp ON f.id = fp.parent_id
)
SELECT full_path FROM file_path WHERE parent_id IS NULL;
```

### Example 2: Comment Threading

```sql
-- Comments with parent_comment_id
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT,
    parent_comment_id INTEGER REFERENCES comments(id),
    created_at TIMESTAMP
);

-- Get comment thread
WITH RECURSIVE comment_thread AS (
    -- Base case: Root comment
    SELECT 
        id,
        content,
        parent_comment_id,
        created_at,
        0 AS depth,
        ARRAY[id] AS thread_path
    FROM comments
    WHERE id = 1  -- Root comment
    
    UNION ALL
    
    -- Recursive case: Replies
    SELECT 
        c.id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        ct.depth + 1,
        ct.thread_path || c.id
    FROM comments c
    JOIN comment_thread ct ON c.parent_comment_id = ct.id
)
SELECT 
    id,
    content,
    depth,
    created_at
FROM comment_thread
ORDER BY thread_path;
```

### Example 3: Bill of Materials (BOM)

```sql
-- Products and their components
CREATE TABLE product_components (
    product_id INTEGER,
    component_id INTEGER,
    quantity INTEGER,
    PRIMARY KEY (product_id, component_id)
);

-- Get all components for a product (recursive)
WITH RECURSIVE bom AS (
    -- Base case: Direct components
    SELECT 
        product_id,
        component_id,
        quantity,
        1 AS level
    FROM product_components
    WHERE product_id = 1
    
    UNION ALL
    
    -- Recursive case: Components of components
    SELECT 
        b.product_id,
        pc.component_id,
        b.quantity * pc.quantity,
        b.level + 1
    FROM bom b
    JOIN product_components pc ON b.component_id = pc.product_id
    WHERE b.level < 10  -- Prevent infinite recursion
)
SELECT * FROM bom;
```

## Preventing Infinite Recursion

### Method 1: Depth Limit

```sql
WITH RECURSIVE tree AS (
    SELECT id, parent_id, 0 AS depth
    FROM nodes WHERE id = 1
    
    UNION ALL
    
    SELECT n.id, n.parent_id, t.depth + 1
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
    WHERE t.depth < 10  -- Limit depth
)
SELECT * FROM tree;
```

### Method 2: Path Tracking

```sql
WITH RECURSIVE tree AS (
    SELECT 
        id,
        parent_id,
        ARRAY[id] AS path
    FROM nodes WHERE id = 1
    
    UNION ALL
    
    SELECT 
        n.id,
        n.parent_id,
        t.path || n.id
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
    WHERE NOT n.id = ANY(t.path)  -- Prevent cycles
)
SELECT * FROM tree;
```

### Method 3: Visited Set

```sql
WITH RECURSIVE tree AS (
    SELECT 
        id,
        parent_id,
        ARRAY[id] AS visited
    FROM nodes WHERE id = 1
    
    UNION ALL
    
    SELECT 
        n.id,
        n.parent_id,
        t.visited || n.id
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
    WHERE NOT n.id = ANY(t.visited)
)
SELECT * FROM tree;
```

## Common Patterns

### Pattern 1: Top-Down (Root to Leaves)

```sql
-- From root to all descendants
WITH RECURSIVE descendants AS (
    SELECT id, name, parent_id, 0 AS level
    FROM tree WHERE parent_id IS NULL  -- Root
    
    UNION ALL
    
    SELECT t.id, t.name, t.parent_id, d.level + 1
    FROM tree t
    JOIN descendants d ON t.parent_id = d.id
)
SELECT * FROM descendants;
```

### Pattern 2: Bottom-Up (Leaf to Root)

```sql
-- From leaf to root (ancestors)
WITH RECURSIVE ancestors AS (
    SELECT id, name, parent_id, 0 AS level
    FROM tree WHERE id = 10  -- Leaf node
    
    UNION ALL
    
    SELECT t.id, t.name, t.parent_id, a.level + 1
    FROM tree t
    JOIN ancestors a ON t.id = a.parent_id
)
SELECT * FROM ancestors;
```

## Performance Considerations

### Indexes

```sql
-- Index parent_id for recursive queries
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Recursive queries use these indexes
```

### Limiting Results

```sql
-- Limit depth to prevent expensive queries
WITH RECURSIVE tree AS (
    SELECT id, parent_id, 0 AS depth
    FROM nodes WHERE id = 1
    
    UNION ALL
    
    SELECT n.id, n.parent_id, t.depth + 1
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
    WHERE t.depth < 5  -- Limit depth
)
SELECT * FROM tree;
```

## Best Practices

1. **Always Limit Depth**: Prevent infinite recursion
2. **Track Paths**: Detect cycles
3. **Use Indexes**: Index parent_id columns
4. **Test Edge Cases**: Empty trees, cycles, deep hierarchies
5. **Monitor Performance**: Recursive queries can be expensive

## Summary

**Recursive CTEs:**

1. **Purpose**: Query hierarchical and tree data
2. **Structure**: Base case + recursive case
3. **Use Cases**: Trees, graphs, hierarchies, BOMs
4. **Safety**: Limit depth, track paths, prevent cycles
5. **Performance**: Use indexes, limit results

**Key Takeaway:**
Recursive CTEs are powerful for querying hierarchical data. They consist of a base case (anchor) and a recursive case that references itself. Always prevent infinite recursion with depth limits or path tracking. Use indexes on parent_id columns for performance.

**Common Use Cases:**
- Organizational hierarchies
- Category trees
- File systems
- Comment threads
- Bill of materials

**Next Steps:**
- Learn [CTEs](ctes.md) for basic CTE usage
- Study [Subqueries](subqueries.md) for alternative approaches
- Master [Performance Optimization](../10_performance_optimization/) for tuning

