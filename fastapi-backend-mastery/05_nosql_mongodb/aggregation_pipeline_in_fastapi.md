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

