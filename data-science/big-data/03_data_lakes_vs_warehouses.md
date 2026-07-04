# Data Lake vs Warehouse vs Lakehouse: Senior Guide

## 1. The Core Choice (Theory)
A Senior Data Engineer chooses based on the **Latency** and the **Structure**.
*   **Data Warehouse (OLAP):** Structured data (tables), optimized for SQL queries. (e.g., **Snowflake**, **BigQuery**).
*   **Data Lake (Storage):** Raw, unstructured data (images, logs, JSON). (e.g., **AWS S3**, **Azure Blob**).
*   **Data Lakehouse (Modern):** Best of both. ACID transactions on top of a Data Lake. (e.g., **Databricks Delta Lake**, **Apache Iceberg**).

## 2. Comparison Table
| Feature | Data Warehouse | Data Lake | Data Lakehouse |
|---------|----------------|-----------|----------------|
| **Data Type** | Structured (Schema-on-write) | Raw (Schema-on-read) | Any (Structured metadata) |
| **Users** | Analysts (SQL) | Data Scientists | Everyone |
| **Cost** | 🐌 High (Compute + Storage) | ✅ Ultra-Low (Storage) | ⚡ Moderate |
| **Speed** | 🚀 Extremely Fast | 🐌 Slow (Needs scanning) | ✅ Fast (Metadata-driven) |

## 3. High-level Architecture Diagram
```mermaid
graph LR
    A[Raw Sources] --> B[Data Lake (Gold/Silver/Bronze)]
    B --> C[Data Warehouse (Aggregated)]
    C --> D[Business Intelligence (Tableau)]
    B --> E[Machine Learning (PySpark)]
```

## 4. Medallion Architecture (Databricks Standard)
1.  **Bronze (Raw):** Landing zone. Data as it is (JSON/CSV). 
2.  **Silver (Cleaned):** Cleaned, filtered, and joined data. Deduplicated records.
3.  **Gold (Business):** Aggregated data for final reporting (e.g., "Daily Sales by Region").

## 5. Senior Insight: ACID on Data Lakes
Why do we need **Delta Lake** or **Iceberg**?
*   **ACID Transactions:** If a Spark job fails halfway, the Data Lake isn't corrupted. It "Rolls Back".
*   **Time Travel:** Query how the data looked exactly 7 days ago.
*   **Schema Evolution:** Adding a new column to a 10TB table without breaking downstream jobs.

## Summary Checklist
- ✅ Data Warehouse (Quick SQL)
- ✅ Data Lake (Massive Raw Data)
- ✅ Data Lakehouse (Modern ACID Lake)
- ✅ Medallion Architecture (Bronze/Silver/Gold)
- ✅ Schema Enforcement (Data Quality)
