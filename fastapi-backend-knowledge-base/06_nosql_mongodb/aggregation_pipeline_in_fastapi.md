# MongoDB Aggregation Pipeline: Complete Guide

MongoDB's aggregation pipeline is like a factory assembly line for data - you pass documents through multiple stages, transforming and filtering at each step. This guide teaches you aggregation from basics to advanced patterns.

## Understanding Aggregation Pipeline

**The concept:**
Think of data flowing through a pipe, being transformed at each stage:

```
Documents → Stage 1 → Stage 2 → Stage 3 → Final Results
   [Input]   [Filter]  [Group]   [Sort]      [Output]
```

**Real-world analogy:**
- Stage 1: Filter raw materials (filter documents)
- Stage 2: Group by category (group by field)
- Stage 3: Count items (aggregate)
- Stage 4: Sort results (sort)
- Output: Final report

## Basic Pipeline Stages

Let's learn each stage with our e-commerce example:

### Stage 1: $match (Filter Documents)

**What it does:** Filters documents (like SQL WHERE)

```python
from motor.motor_asyncio import AsyncIOMotorClient

async def basic_match_example():
    """Filter products by category."""
    db = client.ecommerce
    
    pipeline = [
        {
            "$match": {
                "category": "electronics",
                "price": {"$lt": 1000}  # Price less than 1000
            }
        }
    ]
    
    cursor = db.products.aggregate(pipeline)
    results = await cursor.to_list(length=None)
    return results
```

**Understanding $match:**
- Filters documents before other stages
- Reduces data flowing through pipeline
- Use it early for performance

### Stage 2: $group (Group and Aggregate)

**What it does:** Groups documents and calculates aggregations (like SQL GROUP BY)

```python
async def group_example():
    """Count products by category."""
    db = client.ecommerce
    
    pipeline = [
        {
            "$group": {
                "_id": "$category",  # Group by category field
                "count": {"$sum": 1},  # Count documents in each group
                "avg_price": {"$avg": "$price"},  # Average price
                "total_value": {"$sum": "$price"}  # Sum prices
            }
        }
    ]
    
    cursor = db.products.aggregate(pipeline)
    results = await cursor.to_list(length=None)
    # Returns: [
    #   {"_id": "electronics", "count": 50, "avg_price": 500, "total_value": 25000},
    #   {"_id": "books", "count": 30, "avg_price": 25, "total_value": 750}
    # ]
    return results
```

**Common aggregation operators:**
- `$sum` - Add values
- `$avg` - Calculate average
- `$min` - Minimum value
- `$max` - Maximum value
- `$count` - Count documents

### Stage 3: $sort (Order Results)

**What it does:** Sorts documents (like SQL ORDER BY)

```python
async def sort_example():
    """Sort products by price descending."""
    pipeline = [
        {"$sort": {"price": -1}}  # -1 = descending, 1 = ascending
    ]
    
    cursor = db.products.aggregate(pipeline)
    return await cursor.to_list(length=None)
```

### Stage 4: $limit and $skip (Pagination)

```python
async def pagination_example(skip: int = 0, limit: int = 20):
    """Pagination with aggregation."""
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]
    
    cursor = db.products.aggregate(pipeline)
    return await cursor.to_list(length=limit)
```

## Complete Real-World Examples

### Example 1: Sales Report by Category

```python
async def sales_by_category():
    """Generate sales report grouped by category."""
    db = client.ecommerce
    
    pipeline = [
        # Stage 1: Match completed orders only
        {
            "$match": {
                "status": "completed",
                "created_at": {
                    "$gte": datetime(2024, 1, 1),  # This year
                    "$lt": datetime(2025, 1, 1)
                }
            }
        },
        
        # Stage 2: Unwind items array (one document per item)
        {
            "$unwind": "$items"
        },
        
        # Stage 3: Lookup product details
        {
            "$lookup": {
                "from": "products",
                "localField": "items.product_id",
                "foreignField": "_id",
                "as": "product"
            }
        },
        
        # Stage 4: Unwind product array (was array from lookup)
        {
            "$unwind": "$product"
        },
        
        # Stage 5: Group by category
        {
            "$group": {
                "_id": "$product.category",
                "total_sales": {"$sum": "$items.total"},
                "item_count": {"$sum": "$items.quantity"},
                "order_count": {"$addToSet": "$_id"}  # Unique order IDs
            }
        },
        
        # Stage 6: Calculate order count (from array length)
        {
            "$project": {
                "category": "$_id",
                "total_sales": 1,
                "item_count": 1,
                "order_count": {"$size": "$order_count"}
            }
        },
        
        # Stage 7: Sort by total sales
        {
            "$sort": {"total_sales": -1}
        }
    ]
    
    cursor = db.orders.aggregate(pipeline)
    return await cursor.to_list(length=None)
```

**Understanding each stage:**

1. **$match**: Filter to completed orders this year
2. **$unwind**: Expand items array (order with 3 items → 3 documents)
3. **$lookup**: Join with products collection
4. **$unwind**: Expand product array from lookup
5. **$group**: Aggregate by category
6. **$project**: Reshape output (calculate order_count)
7. **$sort**: Order by sales

### Example 2: Top Customers

```python
async def top_customers(limit: int = 10):
    """Find top spending customers."""
    db = client.ecommerce
    
    pipeline = [
        # Match completed orders
        {
            "$match": {"status": "completed"}
        },
        
        # Group by user
        {
            "$group": {
                "_id": "$user_id",
                "total_spent": {"$sum": "$total_amount"},
                "order_count": {"$sum": 1},
                "first_order": {"$min": "$created_at"},
                "last_order": {"$max": "$created_at"}
            }
        },
        
        # Lookup user details
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        
        # Unwind user
        {
            "$unwind": "$user"
        },
        
        # Project final shape
        {
            "$project": {
                "user_id": "$_id",
                "email": "$user.email",
                "name": "$user.full_name",
                "total_spent": 1,
                "order_count": 1,
                "first_order": 1,
                "last_order": 1,
                "avg_order_value": {
                    "$divide": ["$total_spent", "$order_count"]
                }
            }
        },
        
        # Sort by total spent
        {
            "$sort": {"total_spent": -1}
        },
        
        # Limit results
        {
            "$limit": limit
        }
    ]
    
    cursor = db.orders.aggregate(pipeline)
    return await cursor.to_list(length=limit)
```

### Example 3: Monthly Sales Trends

```python
async def monthly_sales_trend():
    """Sales broken down by month."""
    db = client.ecommerce
    
    pipeline = [
        {
            "$match": {
                "status": "completed",
                "created_at": {
                    "$gte": datetime(2024, 1, 1)
                }
            }
        },
        
        # Extract year and month
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "total_sales": {"$sum": "$total_amount"},
                "order_count": {"$sum": 1}
            }
        },
        
        # Sort by date
        {
            "$sort": {"_id.year": 1, "_id.month": 1}
        },
        
        # Reshape output
        {
            "$project": {
                "year": "$_id.year",
                "month": "$_id.month",
                "total_sales": 1,
                "order_count": 1,
                "avg_order_value": {
                    "$divide": ["$total_sales", "$order_count"]
                }
            }
        }
    ]
    
    cursor = db.orders.aggregate(pipeline)
    return await cursor.to_list(length=None)
```

## Advanced Pipeline Stages

### $unwind - Expand Arrays

```python
async def unwind_example():
    """Process each item in an array separately."""
    pipeline = [
        {
            "$unwind": {
                "path": "$tags",  # Expand tags array
                "preserveNullAndEmptyArrays": True  # Keep docs with no tags
            }
        },
        {
            "$group": {
                "_id": "$tags",
                "product_count": {"$sum": 1}
            }
        }
    ]
    # If product has tags ["electronics", "gaming"], creates 2 documents
```

### $lookup - Join Collections

```python
async def lookup_example():
    """Join orders with users."""
    pipeline = [
        {
            "$lookup": {
                "from": "users",  # Collection to join
                "localField": "user_id",  # Field in current collection
                "foreignField": "_id",  # Field in joined collection
                "as": "user"  # Output array name
            }
        },
        {
            "$unwind": "$user"  # Convert array to object
        }
    ]
```

### $project - Reshape Documents

```python
async def project_example():
    """Select and transform fields."""
    pipeline = [
        {
            "$project": {
                "name": 1,  # Include field
                "price": 1,
                "price_usd": {"$multiply": ["$price", 1.1]},  # Calculate
                "is_expensive": {"$gt": ["$price", 100]},  # Boolean
                "_id": 0  # Exclude _id
            }
        }
    ]
```

### $facet - Multiple Aggregations

```python
async def facet_example():
    """Run multiple aggregations in parallel."""
    pipeline = [
        {
            "$facet": {
                "by_category": [
                    {"$group": {"_id": "$category", "count": {"$sum": 1}}}
                ],
                "by_price_range": [
                    {
                        "$bucket": {
                            "groupBy": "$price",
                            "boundaries": [0, 100, 500, 1000, 5000],
                            "default": "other",
                            "output": {
                                "count": {"$sum": 1},
                                "avg_price": {"$avg": "$price"}
                            }
                        }
                    }
                ],
                "total_stats": [
                    {
                        "$group": {
                            "_id": None,
                            "total": {"$sum": 1},
                            "avg_price": {"$avg": "$price"}
                        }
                    }
                ]
            }
        }
    ]
    # Returns all three aggregations at once
```

## Performance Optimization

### Use Indexes

```python
# Create indexes for fields used in $match
await db.orders.create_index("status")
await db.orders.create_index("created_at")
await db.orders.create_index([("status", 1), ("created_at", -1)])
```

### Early $match

```python
# ✅ Good: Match early
pipeline = [
    {"$match": {"status": "completed"}},  # Filter first!
    {"$group": {...}}
]

# ❌ Bad: Match late
pipeline = [
    {"$group": {...}},
    {"$match": {"status": "completed"}}  # Too late, already grouped
]
```

### Use $limit Early

```python
# ✅ Good: Limit early if possible
pipeline = [
    {"$match": {...}},
    {"$limit": 100},  # Reduce data flow
    {"$group": {...}}
]
```

## Summary

Aggregation pipeline is powerful for:
- ✅ Complex data transformations
- ✅ Multi-stage processing
- ✅ Joining collections
- ✅ Calculating statistics
- ✅ Generating reports

Key stages:
- `$match` - Filter
- `$group` - Aggregate
- `$sort` - Order
- `$lookup` - Join
- `$project` - Reshape
- `$unwind` - Expand arrays

Master the pipeline and you can generate any report or analysis from your MongoDB data!

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain MongoDB aggregation pipeline in FastAPI, including how it works, common stages ($match, $group, $lookup, $project, $unwind), performance optimization, and real-world use cases. Provide detailed examples showing complex aggregations.

**Answer:**

**Aggregation Pipeline Overview:**

MongoDB aggregation pipeline is a framework for data processing that transforms documents through a series of stages. Each stage processes documents and passes results to the next stage, enabling complex data transformations and analytics.

**Why Aggregation Pipeline:**

**Without Aggregation (Multiple Queries):**
```python
# ❌ Bad: Multiple queries, inefficient
async def get_sales_stats():
    orders = await db.orders.find({"status": "completed"}).to_list()
    total_sales = sum(order["total_amount"] for order in orders)
    order_count = len(orders)
    # Problem: Loads all data, processes in Python
```

**With Aggregation (Single Query):**
```python
# ✅ Good: Single query, efficient
async def get_sales_stats():
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": None,
            "total_sales": {"$sum": "$total_amount"},
            "order_count": {"$sum": 1}
        }}
    ]
    result = await db.orders.aggregate(pipeline).to_list(1)
    return result[0]  # Single document with stats
```

**Common Pipeline Stages:**

**1. $match (Filter):**
```python
# Filter documents (like WHERE in SQL)
pipeline = [
    {"$match": {
        "status": "completed",
        "created_at": {"$gte": datetime(2024, 1, 1)}
    }}
]
```

**2. $group (Aggregate):**
```python
# Group and aggregate (like GROUP BY in SQL)
pipeline = [
    {"$group": {
        "_id": "$category",
        "total_sales": {"$sum": "$total_amount"},
        "avg_order": {"$avg": "$total_amount"},
        "order_count": {"$sum": 1},
        "max_order": {"$max": "$total_amount"},
        "min_order": {"$min": "$total_amount"}
    }}
]
```

**3. $lookup (Join):**
```python
# Join collections (like JOIN in SQL)
pipeline = [
    {"$lookup": {
        "from": "users",
        "localField": "user_id",
        "foreignField": "_id",
        "as": "user"
    }},
    {"$unwind": "$user"}  # Convert array to object
]
```

**4. $project (Reshape):**
```python
# Select and transform fields
pipeline = [
    {"$project": {
        "name": 1,
        "price": 1,
        "price_usd": {"$multiply": ["$price", 1.1]},
        "is_expensive": {"$gt": ["$price", 100]},
        "_id": 0
    }}
]
```

**5. $unwind (Expand Arrays):**
```python
# Expand array into separate documents
pipeline = [
    {"$unwind": {
        "path": "$tags",
        "preserveNullAndEmptyArrays": True
    }},
    {"$group": {
        "_id": "$tags",
        "count": {"$sum": 1}
    }}
]
```

**Complex Aggregation Examples:**

**1. Sales by Category:**
```python
async def sales_by_category():
    """Sales statistics grouped by category."""
    pipeline = [
        # Match completed orders
        {"$match": {"status": "completed"}},
        
        # Lookup products
        {"$unwind": "$items"},
        {"$lookup": {
            "from": "products",
            "localField": "items.product_id",
            "foreignField": "_id",
            "as": "product"
        }},
        {"$unwind": "$product"},
        
        # Group by category
        {"$group": {
            "_id": "$product.category_id",
            "total_sales": {"$sum": "$items.total"},
            "order_count": {"$sum": 1},
            "avg_order_value": {"$avg": "$items.total"}
        }},
        
        # Lookup category name
        {"$lookup": {
            "from": "categories",
            "localField": "_id",
            "foreignField": "_id",
            "as": "category"
        }},
        {"$unwind": "$category"},
        
        # Project final shape
        {"$project": {
            "category_name": "$category.name",
            "total_sales": 1,
            "order_count": 1,
            "avg_order_value": 1
        }},
        
        # Sort by sales
        {"$sort": {"total_sales": -1}}
    ]
    
    cursor = db.orders.aggregate(pipeline)
    return await cursor.to_list(length=None)
```

**2. Top Customers:**
```python
async def top_customers(limit: int = 10):
    """Find top spending customers."""
    pipeline = [
        {"$match": {"status": "completed"}},
        
        # Group by user
        {"$group": {
            "_id": "$user_id",
            "total_spent": {"$sum": "$total_amount"},
            "order_count": {"$sum": 1},
            "first_order": {"$min": "$created_at"},
            "last_order": {"$max": "$created_at"}
        }},
        
        # Lookup user details
        {"$lookup": {
            "from": "users",
            "localField": "_id",
            "foreignField": "_id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        
        # Calculate average
        {"$project": {
            "user_id": "$_id",
            "email": "$user.email",
            "name": "$user.full_name",
            "total_spent": 1,
            "order_count": 1,
            "avg_order_value": {
                "$divide": ["$total_spent", "$order_count"]
            }
        }},
        
        # Sort and limit
        {"$sort": {"total_spent": -1}},
        {"$limit": limit}
    ]
    
    cursor = db.orders.aggregate(pipeline)
    return await cursor.to_list(length=limit)
```

**Performance Optimization:**

**1. Use Indexes:**
```python
# Create indexes for fields used in $match
await db.orders.create_index("status")
await db.orders.create_index("created_at")
await db.orders.create_index([("status", 1), ("created_at", -1)])
```

**2. Early $match:**
```python
# ✅ Good: Filter early
pipeline = [
    {"$match": {"status": "completed"}},  # Filter first!
    {"$group": {...}}
]

# ❌ Bad: Filter late
pipeline = [
    {"$group": {...}},
    {"$match": {"status": "completed"}}  # Too late
]
```

**3. Early $limit:**
```python
# ✅ Good: Limit early if possible
pipeline = [
    {"$match": {...}},
    {"$limit": 100},  # Reduce data flow
    {"$group": {...}}
]
```

**4. Use $facet for Multiple Aggregations:**
```python
async def multiple_stats():
    """Run multiple aggregations in parallel."""
    pipeline = [
        {"$facet": {
            "by_category": [
                {"$group": {"_id": "$category", "count": {"$sum": 1}}}
            ],
            "by_price": [
                {"$bucket": {
                    "groupBy": "$price",
                    "boundaries": [0, 100, 500, 1000],
                    "output": {
                        "count": {"$sum": 1},
                        "avg_price": {"$avg": "$price"}
                    }
                }}
            ],
            "total": [
                {"$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "avg_price": {"$avg": "$price"}
                }}
            ]
        }}
    ]
    
    cursor = db.products.aggregate(pipeline)
    return await cursor.to_list(1)
```

**System Design Consideration**: Aggregation pipeline provides:
1. **Performance**: Single query, efficient processing
2. **Flexibility**: Complex transformations
3. **Analytics**: Powerful reporting capabilities
4. **Scalability**: Processes data efficiently

MongoDB aggregation pipeline is powerful for data transformation and analytics. Understanding pipeline stages, performance optimization, and real-world patterns is essential for building efficient data processing systems. Always use indexes, filter early, and optimize pipeline stages for performance.

---

### Q2: Explain advanced aggregation stages ($facet, $bucket, $graphLookup), performance considerations, indexing strategies, and when to use aggregation vs multiple queries. Discuss trade-offs and best practices.

**Answer:**

**Advanced Aggregation Stages:**

**1. $facet (Multiple Aggregations):**
```python
# Run multiple aggregations in parallel
pipeline = [
    {"$facet": {
        "by_category": [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ],
        "by_price_range": [
            {"$bucket": {
                "groupBy": "$price",
                "boundaries": [0, 100, 500, 1000],
                "default": "other"
            }}
        ],
        "stats": [
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "avg": {"$avg": "$price"}
            }}
        ]
    }}
]
```

**2. $bucket (Group into Ranges):**
```python
# Group into price ranges
pipeline = [
    {"$bucket": {
        "groupBy": "$price",
        "boundaries": [0, 100, 500, 1000, 5000],
        "default": "other",
        "output": {
            "count": {"$sum": 1},
            "avg_price": {"$avg": "$price"}
        }
    }}
]
```

**3. $graphLookup (Recursive Join):**
```python
# Find all descendants in tree structure
pipeline = [
    {"$graphLookup": {
        "from": "categories",
        "startWith": "$parent_id",
        "connectFromField": "parent_id",
        "connectToField": "_id",
        "as": "ancestors"
    }}
]
```

**Performance Considerations:**

**1. Index Usage:**
```python
# Create indexes for $match stages
await db.orders.create_index("status")
await db.orders.create_index("created_at")
await db.orders.create_index([("status", 1), ("created_at", -1)])

# Indexes are used automatically in $match
```

**2. Pipeline Order:**
```python
# ✅ Good: Filter, then process
pipeline = [
    {"$match": {"status": "completed"}},  # Filter first
    {"$group": {...}},  # Process filtered data
    {"$sort": {...}},  # Sort after grouping
    {"$limit": 100}  # Limit at end
]

# ❌ Bad: Process, then filter
pipeline = [
    {"$group": {...}},  # Process all data
    {"$match": {"status": "completed"}}  # Filter after processing
]
```

**3. Memory Management:**
```python
# Use $limit early to reduce memory
pipeline = [
    {"$match": {...}},
    {"$limit": 1000},  # Limit early
    {"$group": {...}}
]

# Use allowDiskUse for large datasets
result = await db.orders.aggregate(
    pipeline,
    allowDiskUse=True  # Use disk for large operations
)
```

**When to Use Aggregation vs Multiple Queries:**

**Use Aggregation When:**
- Complex transformations needed
- Multiple stages required
- Joining collections
- Calculating statistics
- Generating reports

**Use Multiple Queries When:**
- Simple lookups
- Single collection queries
- Simple filtering
- Real-time data needed

**System Design Consideration**: Aggregation requires:
1. **Indexing**: Proper indexes for performance
2. **Pipeline Order**: Optimize stage order
3. **Memory**: Manage large datasets
4. **Caching**: Cache aggregation results

Understanding advanced aggregation stages, performance optimization, and when to use aggregation vs multiple queries is essential for building efficient data processing systems. Always optimize pipeline order, use indexes, and consider memory usage for large datasets.


