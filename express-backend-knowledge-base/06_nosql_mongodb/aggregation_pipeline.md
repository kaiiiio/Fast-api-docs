# Aggregation Pipeline: Complex Queries in MongoDB

MongoDB aggregation pipeline processes documents through multiple stages, enabling complex data transformations and analytics. This guide covers using aggregation pipelines in Express.js with Mongoose and native driver.

## What is Aggregation Pipeline?

**Aggregation pipeline** processes documents through a series of stages, transforming data at each stage. It's MongoDB's way of performing complex queries and data transformations.

### Basic Concept

```javascript
// Aggregation pipeline stages
[
    { $match: { status: 'active' } },      // Filter documents
    { $group: { _id: '$category', count: { $sum: 1 } } },  // Group and aggregate
    { $sort: { count: -1 } }              // Sort results
]
```

## Aggregation Stages

### $match - Filter Documents

```javascript
// Filter documents (like WHERE in SQL)
const pipeline = [
    {
        $match: {
            status: 'active',
            age: { $gte: 18 }
        }
    }
];

const users = await User.aggregate(pipeline);
```

### $group - Group and Aggregate

```javascript
// Group documents and calculate aggregates
const pipeline = [
    {
        $group: {
            _id: '$category',           // Group by category
            count: { $sum: 1 },         // Count documents
            total: { $sum: '$price' },  // Sum prices
            avg: { $avg: '$price' },    // Average price
            max: { $max: '$price' },    // Maximum price
            min: { $min: '$price' }     // Minimum price
        }
    }
];

const stats = await Product.aggregate(pipeline);
```

### $project - Reshape Documents

```javascript
// Select and reshape fields
const pipeline = [
    {
        $project: {
            name: 1,                    // Include name
            email: 1,                   // Include email
            fullName: {                 // Create computed field
                $concat: ['$firstName', ' ', '$lastName']
            },
            age: 1,
            _id: 0                      // Exclude _id
        }
    }
];

const users = await User.aggregate(pipeline);
```

### $sort - Sort Documents

```javascript
// Sort documents
const pipeline = [
    {
        $sort: {
            createdAt: -1,  // Descending
            name: 1         // Ascending (secondary sort)
        }
    }
];

const users = await User.aggregate(pipeline);
```

### $limit and $skip - Pagination

```javascript
// Pagination
const pipeline = [
    { $sort: { createdAt: -1 } },
    { $skip: 20 },   // Skip first 20
    { $limit: 10 }   // Take 10
];

const users = await User.aggregate(pipeline);
```

## Real-World Examples

### Example 1: Sales Analytics

```javascript
// Sales by category with totals
const pipeline = [
    {
        $match: {
            status: 'completed',
            createdAt: {
                $gte: new Date('2023-01-01'),
                $lte: new Date('2023-12-31')
            }
        }
    },
    {
        $unwind: '$items'  // Expand array of items
    },
    {
        $lookup: {  // Join with products
            from: 'products',
            localField: 'items.product_id',
            foreignField: '_id',
            as: 'product'
        }
    },
    {
        $unwind: '$product'
    },
    {
        $group: {
            _id: '$product.category',
            totalSales: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: { $multiply: ['$items.quantity', '$items.price'] } }
        }
    },
    {
        $sort: { totalSales: -1 }
    }
];

const salesStats = await Order.aggregate(pipeline);
```

### Example 2: User Activity Summary

```javascript
// User activity summary
const pipeline = [
    {
        $match: {
            createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)  // Last 30 days
            }
        }
    },
    {
        $group: {
            _id: '$user_id',
            activityCount: { $sum: 1 },
            lastActivity: { $max: '$createdAt' },
            firstActivity: { $min: '$createdAt' },
            activityTypes: { $addToSet: '$type' }  // Unique activity types
        }
    },
    {
        $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
        }
    },
    {
        $unwind: '$user'
    },
    {
        $project: {
            userId: '$_id',
            userName: '$user.name',
            userEmail: '$user.email',
            activityCount: 1,
            lastActivity: 1,
            activityTypes: 1,
            _id: 0
        }
    },
    {
        $sort: { activityCount: -1 }
    },
    {
        $limit: 10  // Top 10 active users
    }
];

const topActiveUsers = await Activity.aggregate(pipeline);
```

### Example 3: Time-Based Analytics

```javascript
// Daily sales report
const pipeline = [
    {
        $match: {
            status: 'completed',
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }
    },
    {
        $group: {
            _id: {
                $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                }
            },
            totalSales: { $sum: '$total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
            uniqueCustomers: { $addToSet: '$user_id' }
        }
    },
    {
        $project: {
            date: '$_id',
            totalSales: 1,
            orderCount: 1,
            avgOrderValue: 1,
            uniqueCustomerCount: { $size: '$uniqueCustomers' },
            _id: 0
        }
    },
    {
        $sort: { date: 1 }
    }
];

const dailyReport = await Order.aggregate(pipeline);
```

## Using with Mongoose

### Mongoose Aggregation

```javascript
const User = require('./models/User');

// Simple aggregation
const pipeline = [
    { $match: { isActive: true } },
    { $group: { _id: '$role', count: { $sum: 1 } } }
];

const roleCounts = await User.aggregate(pipeline);

// With Express route
app.get('/users/stats', async (req, res) => {
    const pipeline = [
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
                avgAge: { $avg: '$age' }
            }
        }
    ];
    
    const stats = await User.aggregate(pipeline);
    res.json(stats);
});
```

## Using with Native Driver

### Native Driver Aggregation

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('mydb');
const users = db.collection('users');

const pipeline = [
    { $match: { isActive: true } },
    { $group: { _id: '$role', count: { $sum: 1 } } }
];

const results = await users.aggregate(pipeline).toArray();
```

## Advanced Patterns

### Pattern 1: Faceted Search

**Faceted Search** (also known as "navigation categories") allows users to filter data through multiple independent dimensions (facets) simultaneously. In MongoDB, this is achieved using the **$facet** stage, which executes multiple aggregation pipelines in parallel within a single query, returning a document with fields for each facet's results (e.g., categories, price ranges, and total count).

```javascript
// Faceted search with multiple aggregations
const pipeline = [
    {
        $facet: {
            categories: [
                { $unwind: '$categories' },
                { $group: { _id: '$categories', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ],
            priceRanges: [
                {
                    $bucket: {
                        groupBy: '$price',
                        boundaries: [0, 10, 50, 100, 500],
                        default: 'Other',
                        output: { count: { $sum: 1 } }
                    }
                }
            ],
            total: [
                { $count: 'count' }
            ]
        }
    }
];

const facets = await Product.aggregate(pipeline);
```

### Pattern 2: Text Search with Aggregation

```javascript
// Text search with relevance scoring
const pipeline = [
    {
        $match: {
            $text: { $search: 'laptop computer' }
        }
    },
    {
        $addFields: {
            score: { $meta: 'textScore' }
        }
    },
    {
        $sort: { score: -1 }
    },
    {
        $limit: 10
    }
];

const results = await Product.aggregate(pipeline);
```

## Best Practices

1. **Index Fields**: Index fields used in $match and $sort
2. **Early Filtering**: Use $match early to reduce documents
3. **Limit Results**: Use $limit to restrict output
4. **Project Fields**: Use $project to reduce data transfer
5. **Test Performance**: Monitor aggregation performance

## Summary

**Aggregation Pipeline:**

1. **Purpose**: Complex data transformations and analytics
2. **Stages**: $match, $group, $project, $sort, $limit, $skip
3. **Use Cases**: Analytics, reporting, data transformation
4. **Best Practice**: Index fields, filter early, limit results
5. **Tools**: Works with both Mongoose and native driver

**Key Takeaway:**
MongoDB aggregation pipeline processes documents through multiple stages, enabling complex queries and data transformations. Use stages like $match for filtering, $group for aggregations, and $project for reshaping. Aggregation pipelines are powerful for analytics, reporting, and data transformations. Index fields used in pipelines and filter early for performance.

**Common Stages:**
- $match: Filter documents
- $group: Aggregate data
- $project: Reshape documents
- $sort: Sort results
- $limit/$skip: Pagination

---

## 🎯 Interview Questions: Aggregation Pipeline

### Q1: When would you choose the aggregation pipeline over MapReduce? What are the trade-offs?

**Answer:**

The primary difference lies in the **execution environment and native optimization**. The Aggregation Pipeline is the modern, highly optimized standard that runs entirely within the MongoDB engine using C++, whereas MapReduce is a legacy system that relies on a much slower JavaScript execution model.

```
Aggregation Pipeline:
├─ Runs inside the MongoDB engine
├─ Stage-based ($match, $group, $project…)
├─ Index-aware, highly optimized
├─ Real-time analytics, dashboards, APIs
└─ Recommended for >95% scenarios

MapReduce:
├─ Uses JavaScript map/reduce functions
├─ Slower, executed outside core engine
├─ Requires sharding for scale
└─ Legacy or extremely custom logic
```

**Visual:**

```
Aggregation Pipeline:   $match → $group → $project → $sort
MapReduce:              map() → shuffle → reduce() → finalize()
```

### Q2: How do you optimize aggregation pipelines for large datasets?

**Answer:**

Optimizing aggregations for large-scale production relies on the **"Filter Early, Project Often"** mantra. By reducing the number of documents and the size of each document as early as possible in the pipeline, you minimize RAM usage and CPU cycles consumed by later stages.

1. **Filter Early:** Place `$match` as the first stage so fewer documents flow downstream.
2. **Project Fields:** Use `$project` or `$unset` to remove unused fields and reduce document size.
3. **Use Covered Indexes:** Ensure `$match` and `$sort` use compound indexes.
4. **Limit Data:** Apply `$limit` (and `$skip` with caution) to cap result size.
5. **Use `$facet` Carefully:** Separate heavy computations, monitor memory usage.

```javascript
const pipeline = [
  { $match: { status: 'COMPLETED', createdAt: { $gte: start, $lte: end } } }, // early filter
  { $project: { userId: 1, total: 1, createdAt: 1 } },                        // trim fields
  { $group: { _id: '$userId', totalSpent: { $sum: '$total' } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 5 }
];
```

---

## Summary

These interview questions cover:
- ✅ Aggregation pipeline vs MapReduce
- ✅ Pipeline optimization strategies
- ✅ Best practices for large datasets

Master these for mid/senior MongoDB interviews focused on analytics & reporting.

**Next Steps:**
- Learn [Mongoose Setup](mongoose_setup_and_basics.md) for ODM usage
- Study [Change Streams](change_streams_for_events.md) for real-time updates
- Master [Data Modeling](data_modeling_for_document_dbs.md) for schema design

