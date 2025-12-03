# Pagination Strategies

Efficient pagination is crucial for APIs that return large datasets. This guide covers different pagination strategies and their tradeoffs.

## Offset-Based Pagination

### Basic Implementation

```javascript
const { User } = require('../models');

// getUsers: Offset-based pagination using LIMIT and OFFSET.
async function getUsers(skip = 0, limit = 20) {
    // OFFSET: Skip first N records, LIMIT: Return next M records.
    const users = await User.findAll({
        offset: skip,  // Skip first N records
        limit: limit,  // Return next M records
        order: [['created_at', 'DESC']],  // Order by creation date
    });
    
    return users;
}

// API endpoint: Calculate skip from page number.
app.get("/users/", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;  // Default to page 1
        const size = parseInt(req.query.size, 10) || 20;  // Default to 20 items
        
        // Calculate skip: (page - 1) * size
        const skip = (page - 1) * size;
        
        const users = await getUsers(skip, size);
        
        // Get total count: Can be expensive for large tables.
        const total = await User.count();
        
        res.json({
            items: users,
            total: total,
            page: page,
            size: size,
            pages: Math.ceil(total / size)  // Total number of pages
        });
    } catch (error) {
        next(error);
    }
});
```

### Pros and Cons

**Pros:** Simple to implement, can jump to any page, and easy to understand.

**Cons:** Performance degrades with large offsets, inconsistent results if data changes, and total count query can be expensive.

## Cursor-Based Pagination

### Implementation

```javascript
// getUsersCursor: Cursor-based pagination using WHERE clause.
async function getUsersCursor(cursor = null, limit = 20) {
    const whereClause = cursor ? { id: { [Op.gt]: cursor } } : {};  // WHERE id > cursor
    
    // Fetch one extra: Used to detect if there's a next page.
    const users = await User.findAll({
        where: whereClause,
        order: [['id', 'ASC']],  // Must order by cursor column
        limit: limit + 1,  // Fetch one extra to check for next page
    });
    
    // Check if there's a next page: If we got limit+1 items, there's more.
    const hasNext = users.length > limit;
    if (hasNext) {
        users.pop();  // Remove extra item (don't return it)
    }
    
    // Next cursor: ID of last item, used for next page request.
    const nextCursor = users.length > 0 && hasNext ? users[users.length - 1].id : null;
    
    return { users, nextCursor, hasNext };
}

// API endpoint: Use cursor instead of page number.
app.get("/users/", async (req, res, next) => {
    try {
        const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;
        const limit = parseInt(req.query.limit, 10) || 20;
        
        const { users, nextCursor, hasNext } = await getUsersCursor(cursor, limit);
        
        res.json({
            items: users,
            next_cursor: nextCursor,
            has_more: hasNext
        });
    } catch (error) {
        next(error);
    }
});
```

### Pros and Cons

**Pros:** Consistent results even if data changes, better performance for large datasets, and no expensive count queries.

**Cons:** Can't jump to arbitrary pages, requires ordered column (usually ID), and slightly more complex.

## Keyset Pagination (Timestamp/Composite)

### Using Timestamps

```javascript
const { Op } = require('sequelize');

// getUsersKeyset: Keyset pagination using timestamp cursor.
async function getUsersKeyset(cursor = null, cursorId = null, limit = 20) {
    let whereClause = {};
    
    if (cursor) {
        // Composite cursor: Use both timestamp and ID for tie-breaking.
        whereClause = {
            [Op.or]: [
                { created_at: { [Op.lt]: cursor } },  // created_at < cursor
                {
                    created_at: cursor,
                    id: { [Op.lt]: cursorId }  // If same timestamp, use ID
                }
            ]
        };
    }
    
    // Fetch one extra: Used to detect if there's a next page.
    const users = await User.findAll({
        where: whereClause,
        order: [
            ['created_at', 'DESC'],  // Primary sort: Most recent first
            ['id', 'DESC']  // Secondary sort: For tie-breaking
        ],
        limit: limit + 1,
    });
    
    const hasNext = users.length > limit;
    if (hasNext) {
        users.pop();
    }
    
    // Next cursor: Timestamp and ID of last item.
    const lastUser = users[users.length - 1];
    const nextCursor = hasNext && lastUser ? {
        timestamp: lastUser.created_at,
        id: lastUser.id
    } : null;
    
    return { users, nextCursor, hasNext };
}

// API endpoint: Accept composite cursor.
app.get("/users/", async (req, res, next) => {
    try {
        const cursor = req.query.cursor ? JSON.parse(req.query.cursor) : null;
        const limit = parseInt(req.query.limit, 10) || 20;
        
        const { users, nextCursor, hasNext } = await getUsersKeyset(
            cursor?.timestamp,
            cursor?.id,
            limit
        );
        
        res.json({
            items: users,
            next_cursor: nextCursor,
            has_more: hasNext
        });
    } catch (error) {
        next(error);
    }
});
```

### Pros and Cons

**Pros:** Works well with time-based sorting, consistent results, and good performance.

**Cons:** More complex implementation, requires composite cursor, and can't jump to arbitrary pages.

## Seek Pagination

### Implementation

```javascript
// getUsersSeek: Seek pagination using WHERE with multiple conditions.
async function getUsersSeek(lastId = null, lastCreatedAt = null, limit = 20) {
    let whereClause = {};
    
    if (lastId && lastCreatedAt) {
        // Seek: Find records after this point.
        whereClause = {
            [Op.or]: [
                { created_at: { [Op.gt]: lastCreatedAt } },
                {
                    created_at: lastCreatedAt,
                    id: { [Op.gt]: lastId }
                }
            ]
        };
    }
    
    const users = await User.findAll({
        where: whereClause,
        order: [
            ['created_at', 'ASC'],
            ['id', 'ASC']
        ],
        limit: limit + 1,
    });
    
    const hasNext = users.length > limit;
    if (hasNext) {
        users.pop();
    }
    
    const lastUser = users[users.length - 1];
    const nextSeek = hasNext && lastUser ? {
        id: lastUser.id,
        created_at: lastUser.created_at
    } : null;
    
    return { users, nextSeek, hasNext };
}
```

## Comparison Matrix

| Strategy | Performance | Consistency | Jump to Page | Complexity |
|----------|-------------|-------------|--------------|------------|
| Offset | ⚠️ Degrades with offset | ❌ Inconsistent | ✅ Yes | ✅ Simple |
| Cursor | ✅ Excellent | ✅ Consistent | ❌ No | ⚠️ Moderate |
| Keyset | ✅ Excellent | ✅ Consistent | ❌ No | ⚠️ Moderate |
| Seek | ✅ Excellent | ✅ Consistent | ❌ No | ⚠️ Moderate |

## When to Use Each

### Use Offset-Based When:
- Small datasets (< 10,000 records)
- Need to jump to arbitrary pages
- Simple requirements

### Use Cursor-Based When:
- Large datasets (> 10,000 records)
- Infinite scroll or "load more" UI
- Consistent results important

### Use Keyset When:
- Time-based sorting (newest first)
- Need consistent results
- Large datasets

## Best Practices

1. **Always Order Results**: Pagination requires consistent ordering
2. **Set Reasonable Limits**: Prevent abuse (max 100 items per page)
3. **Index Cursor Columns**: Index columns used in WHERE clauses
4. **Return Metadata**: Include `has_more`, `next_cursor`, etc.
5. **Handle Edge Cases**: Empty results, invalid cursors, etc.

## Summary

Pagination strategies in Express.js include: Offset-based (simple, but degrades), cursor-based (consistent, performant), keyset (time-based, composite), and seek (flexible). Choose based on dataset size, consistency requirements, and UI needs.

---

## 🎯 Interview Questions: Pagination Strategies

### Q1: Compare offset-based vs cursor-based pagination. When would you use each?

**Answer:**

**Offset-Based Pagination:**

```javascript
// GET /users?page=1&limit=10
app.get('/users', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { count, rows } = await User.findAndCountAll({
        limit,
        offset,
        order: [['created_at', 'DESC']]
    });
    
    res.json({
        data: rows,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit)
        }
    });
});
```

**Pros:**
- ✅ Simple to implement
- ✅ Easy to understand
- ✅ Jump to any page

**Cons:**
- ❌ Slow with large offset (OFFSET 10000 = scan 10000 rows)
- ❌ Inconsistent (items can appear on multiple pages if data changes)

**Cursor-Based Pagination:**

```javascript
// GET /users?cursor=123&limit=10
app.get('/users', async (req, res) => {
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const limit = parseInt(req.query.limit) || 10;
    
    const where = cursor ? { id: { [Op.gt]: cursor } } : {};
    
    const users = await User.findAll({
        where,
        limit: limit + 1,  // Fetch one extra
        order: [['id', 'ASC']]
    });
    
    const hasMore = users.length > limit;
    const data = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore ? data[data.length - 1].id : null;
    
    res.json({
        data,
        cursor: nextCursor,
        hasMore
    });
});
```

**Pros:**
- ✅ Consistent (stable results)
- ✅ Fast (uses index, no OFFSET)
- ✅ Works with large datasets

**Cons:**
- ❌ Can't jump to specific page
- ❌ More complex implementation

**When to Use:**

```
Offset-Based:
├─ Small datasets (< 10,000 items)
├─ Need to jump to specific page
├─ Simple UI requirements
└─ Example: Admin dashboards

Cursor-Based:
├─ Large datasets (millions of items)
├─ Real-time feeds (Twitter, Instagram)
├─ Consistent results required
└─ Example: Social media feeds
```

---

### Q2: How would you implement pagination for a real-time feed that needs to handle new items being added?

**Answer:**

**Problem:** New items added while user is paginating can cause duplicates or skipped items.

**Solution: Cursor-Based with Timestamp:**

```javascript
app.get('/feed', async (req, res) => {
    const cursor = req.query.cursor ? JSON.parse(req.query.cursor) : null;
    const limit = parseInt(req.query.limit) || 20;
    
    // Cursor: { id: 123, created_at: '2024-01-01T00:00:00Z' }
    const where = cursor ? {
        [Op.or]: [
            { created_at: { [Op.lt]: cursor.created_at } },
            {
                created_at: cursor.created_at,
                id: { [Op.lt]: cursor.id }
            }
        ]
    } : {};
    
    const posts = await Post.findAll({
        where,
        limit: limit + 1,
        order: [['created_at', 'DESC'], ['id', 'DESC']]
    });
    
    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;
    
    const nextCursor = hasMore ? {
        id: data[data.length - 1].id,
        created_at: data[data.length - 1].created_at
    } : null;
    
    res.json({
        data,
        cursor: nextCursor ? Buffer.from(JSON.stringify(nextCursor)).toString('base64') : null,
        hasMore
    });
});
```

**Benefits:**
- ✅ Consistent results (even with new items)
- ✅ No duplicates or skipped items
- ✅ Works with real-time updates

---

## Summary

These interview questions cover:
- ✅ Offset vs cursor pagination comparison
- ✅ Real-time feed pagination
- ✅ Performance considerations
- ✅ Implementation strategies

Master these for senior-level interviews focusing on pagination and performance.

