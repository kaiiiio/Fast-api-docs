# GROUPING SETS, ROLLUP, and CUBE: Advanced Aggregation

GROUPING SETS, ROLLUP, and CUBE provide powerful ways to generate multiple levels of aggregation in a single query. They're essential for reporting and analytics.

## GROUPING SETS

**GROUPING SETS** allows you to specify multiple grouping levels in a single query.

### Basic Syntax

```sql
SELECT 
    column1,
    column2,
    aggregate_function(column3)
FROM table
GROUP BY GROUPING SETS (
    (column1),
    (column2),
    (column1, column2),
    ()  -- Grand total
);
```

### Example: Sales by Region and Product

```sql
-- Without GROUPING SETS: Multiple queries needed
SELECT region, SUM(sales) FROM sales GROUP BY region;
SELECT product, SUM(sales) FROM sales GROUP BY product;
SELECT region, product, SUM(sales) FROM sales GROUP BY region, product;
SELECT SUM(sales) FROM sales;  -- Grand total

-- With GROUPING SETS: Single query
SELECT 
    region,
    product,
    SUM(sales) AS total_sales
FROM sales
GROUP BY GROUPING SETS (
    (region),           -- Sales by region
    (product),          -- Sales by product
    (region, product),  -- Sales by region and product
    ()                  -- Grand total
);
```

### Real-World Example

```sql
-- Sales analysis: Multiple aggregation levels
SELECT 
    COALESCE(region, 'All Regions') AS region,
    COALESCE(product, 'All Products') AS product,
    SUM(amount) AS total_sales,
    COUNT(*) AS order_count
FROM orders
GROUP BY GROUPING SETS (
    (region),           -- Total by region
    (product),        -- Total by product
    (region, product), -- Total by region and product
    ()                 -- Grand total
)
ORDER BY region, product;
```

## ROLLUP

**ROLLUP** generates hierarchical aggregations, creating subtotals at each level.

### Basic Syntax

```sql
SELECT 
    column1,
    column2,
    aggregate_function(column3)
FROM table
GROUP BY ROLLUP (column1, column2);
-- Equivalent to GROUPING SETS:
-- (column1, column2)
-- (column1)
-- ()
```

### Example: Hierarchical Totals

```sql
-- Sales by year, month, day
SELECT 
    year,
    month,
    day,
    SUM(sales) AS total_sales
FROM sales
GROUP BY ROLLUP (year, month, day);

-- Results:
-- 2023, 01, 01, 1000  -- Day level
-- 2023, 01, NULL, 5000 -- Month level (sum of all days in Jan)
-- 2023, NULL, NULL, 20000 -- Year level (sum of all months)
-- NULL, NULL, NULL, 50000 -- Grand total
```

### Real-World Example: Department Hierarchy

```sql
-- Employee count by department, team, role
SELECT 
    department,
    team,
    role,
    COUNT(*) AS employee_count
FROM employees
GROUP BY ROLLUP (department, team, role);

-- Results show:
-- Department → Team → Role (detailed)
-- Department → Team (team subtotals)
-- Department (department subtotals)
-- Grand total
```

## CUBE

**CUBE** generates all possible combinations of grouping columns.

### Basic Syntax

```sql
SELECT 
    column1,
    column2,
    aggregate_function(column3)
FROM table
GROUP BY CUBE (column1, column2);
-- Equivalent to GROUPING SETS:
-- (column1, column2)
-- (column1)
-- (column2)
-- ()
```

### Example: All Combinations

```sql
-- Sales by region and product (all combinations)
SELECT 
    region,
    product,
    SUM(sales) AS total_sales
FROM sales
GROUP BY CUBE (region, product);

-- Generates:
-- (region, product)  -- Both grouped
-- (region)           -- Only region
-- (product)          -- Only product
-- ()                 -- Grand total
```

### Real-World Example: Multi-Dimensional Analysis

```sql
-- Sales analysis: Region, Product, Time
SELECT 
    region,
    product,
    quarter,
    SUM(amount) AS total_sales
FROM sales
GROUP BY CUBE (region, product, quarter);

-- All possible combinations:
-- (region, product, quarter)
-- (region, product)
-- (region, quarter)
-- (product, quarter)
-- (region)
-- (product)
-- (quarter)
-- ()
```

## Identifying Aggregation Levels

### GROUPING() Function

```sql
-- Identify which level of aggregation
SELECT 
    region,
    product,
    SUM(sales) AS total_sales,
    GROUPING(region) AS is_region_total,
    GROUPING(product) AS is_product_total
FROM sales
GROUP BY ROLLUP (region, product);

-- GROUPING(column) returns:
-- 0: Column is part of grouping
-- 1: Column is aggregated (NULL in result)
```

### Using GROUPING() for Labels

```sql
-- Clear labels for aggregation levels
SELECT 
    CASE 
        WHEN GROUPING(region) = 1 THEN 'All Regions'
        ELSE region
    END AS region,
    CASE 
        WHEN GROUPING(product) = 1 THEN 'All Products'
        ELSE product
    END AS product,
    SUM(sales) AS total_sales
FROM sales
GROUP BY ROLLUP (region, product);
```

## Performance Considerations

### Index Usage

```sql
-- Indexes help with GROUPING SETS
CREATE INDEX idx_sales_region_product ON sales(region, product);

-- Query can use index for grouping
SELECT region, product, SUM(sales)
FROM sales
GROUP BY GROUPING SETS ((region), (product), (region, product));
```

### Materialized Views

```sql
-- Pre-compute aggregations for performance
CREATE MATERIALIZED VIEW sales_summary AS
SELECT 
    region,
    product,
    SUM(sales) AS total_sales
FROM sales
GROUP BY CUBE (region, product);

-- Fast queries
SELECT * FROM sales_summary WHERE region = 'North';
```

## Common Use Cases

### Use Case 1: Financial Reports

```sql
-- Multi-level financial summary
SELECT 
    account_type,
    category,
    month,
    SUM(amount) AS total
FROM transactions
GROUP BY ROLLUP (account_type, category, month);
-- Shows: Account → Category → Month hierarchy
```

### Use Case 2: Inventory Analysis

```sql
-- Inventory by warehouse, product, location
SELECT 
    warehouse,
    product,
    location,
    SUM(quantity) AS total_quantity
FROM inventory
GROUP BY CUBE (warehouse, product, location);
-- All combinations for analysis
```

### Use Case 3: Sales Dashboard

```sql
-- Sales dashboard with multiple views
SELECT 
    salesperson,
    region,
    product,
    SUM(sales) AS total_sales
FROM sales
GROUP BY GROUPING SETS (
    (salesperson),        -- Sales by person
    (region),            -- Sales by region
    (product),           -- Sales by product
    (salesperson, region), -- Sales by person and region
    ()                   -- Grand total
);
```

## Best Practices

1. **Use ROLLUP**: For hierarchical data (year → month → day)
2. **Use CUBE**: For multi-dimensional analysis (all combinations)
3. **Use GROUPING SETS**: For specific combinations
4. **Use GROUPING()**: To identify aggregation levels
5. **Add Indexes**: For better performance

## Summary

**GROUPING SETS, ROLLUP, CUBE:**

1. **GROUPING SETS**: Specify exact grouping combinations
2. **ROLLUP**: Hierarchical aggregations (drill-down)
3. **CUBE**: All possible combinations
4. **GROUPING()**: Identify aggregation levels
5. **Performance**: Use indexes and materialized views

**Key Takeaway:**
GROUPING SETS, ROLLUP, and CUBE provide powerful aggregation capabilities. Use ROLLUP for hierarchies, CUBE for multi-dimensional analysis, and GROUPING SETS for specific combinations. Use GROUPING() to identify aggregation levels and format results clearly.

**When to Use:**
- ROLLUP: Hierarchical data (time, geography, organization)
- CUBE: Multi-dimensional analysis (all combinations)
- GROUPING SETS: Specific reporting needs

**Next Steps:**
- Learn [Window Functions](window_functions.md) for advanced analytics
- Study [Aggregate Functions](aggregate_functions.md) for basics
- Master [Performance Optimization](../10_performance_optimization/) for tuning

