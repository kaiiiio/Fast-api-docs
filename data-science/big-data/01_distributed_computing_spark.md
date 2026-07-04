# Distributed Computing (PySpark): Senior Guide

## 1. What is Spark? (Theory)
Apache Spark is a distributed computing engine that processes data in **Parallel** across multiple servers.
*   **The Concept:** Data is too big for one RAM. Spark splits the data into "Partitions" and sends it to "Executor" nodes.
*   **Hadoop (Disk) vs Spark (RAM):** Spark is ~100x faster than MapReduce because it keeps data in **RAM** instead of writing to disk every time.

## 2. Spark Architecture Diagram
```mermaid
graph TD
    A[Cluster Manager] --> B[Driver (The Brain)]
    B --> C[Executor 1 (The Hand)]
    B --> D[Executor 2 (The Hand)]
    B --> E[Executor 3 (The Hand)]
    C --> F[Partition (Data chunk)]
    D --> G[Partition (Data chunk)]
    E --> H[Partition (Data chunk)]
```

## 3. High-level Design (Senior Path)
1.  **Lazy Evaluation:** Spark creates a "Logical Plan" (DAG) when you tell it what to do (e.g., `filter()`). It **doesn't** run anything until you call an "Action" (e.g., `count()`, `collect()`).
    - **Pros:** Catalyst Optimizer picks the fastest way to run the query. 
2.  **Partitions:** The fundamental unit of parallelism. 
    - **Too many partitions:** Small file problem (Too much overhead).
    - **Too few partitions:** Idle executors (Slow processing).
3.  **DataFrames:** The modern, high-level API. Always prefer DFs over RDDs for the **Catalyst Optimizer**.

## 4. Key Performance Concepts
*   **Shuffle:** Moving data between different servers (e.g., `groupBy`). Shuffles are **Slow** and should be minimized.
*   **Caching:** Store a frequently used DataFrame in memory (`df.cache()`) so it's not recomputed from scratch.
*   **Broadcast Join:** Sending a small table (e.g., "Cities") to all executors to avoid a massive Shuffle join.

## 5. Summary Implementation (Minimalist)
```python
from pyspark.sql import SparkSession

# Init Spark
spark = SparkSession.builder.appName("BigDataApp").getOrCreate()

# Read & Filter (Transformations - Lazy)
df = spark.read.csv("s3://data.csv")
filtered_df = df.filter(df["age"] > 25)

# Count (Action - Triggers DAG)
result = filtered_df.count() # Run everything here
```

## Summary Checklist
- ✅ Driver (Plan)
- ✅ Executors (Work)
- ✅ Transformations (Lazy)
- ✅ Actions (Trigger)
- ✅ Shuffle (Bottleneck)
- ✅ Broadcast (Optimize)
