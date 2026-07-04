# Hadoop Ecosystem Overview: Senior Guide

## 1. What is Hadoop? (Theory)
Apache Hadoop is the **Foundation** of the Big Data world. 
*   **The Concept:** Before Spark, Hadoop was the only way to process 100TB+ on cheap commodity hardware. It works by storing data on many disks instead of one.
*   **Cost Efficiency:** Uses inexpensive hard drives rather than expensive enterprise SANs.
*   **Data Locality:** Moving compute to where the data is, instead of moving data over a slow network.

## 2. Hadoop Core Components Diagram
```mermaid
graph TD
    A[Hadoop Ecosystem] --> B[HDFS (Storage)]
    A --> C[YARN (Resource Management)]
    A --> D[MapReduce (Computing)]
    B --> E[NameNode (Master)]
    B --> F[DataNode (Slave)]
    C --> G[ResourceManager]
    C --> H[NodeManager]
```

## 3. High-level Design (Senior Path)
1.  **HDFS (Distributed File System):** 
    - **Blocks:** Big files are split into **128MB** chunks and spread across multiple nodes.
    - **Replication:** Each chunk is copied **3 times** by default (Fault Tolerance). If 2 servers die, you still have your data.
2.  **YARN (Yet Another Resource Negotiatier):** Like an OS for the Cluster. It tells Spark/Hadoop who gets how much CPU and RAM.
3.  **MapReduce:** 
    - **Map:** Split the task into 1000 pieces.
    - **Reduce:** Combine the results into 1 final output.

## 4. Key Performance Concepts
*   **Data Locality:** Hadoop starts the "Map" task on the **Same physical server** that has the HDFS block. Zero network delay.
*   **Rack Awareness:** Keeping 2 copies of data in one rack (speed) and 1 copy in a different rack (if the first one loses power).
*   **Speculative Execution:** If 1 task is slow, Hadoop starts a **duplicate** of it on a different server to see who finishes first.

## 5. Modern Use Case (Senior Insight)
HDFS is being replaced by **Object Storage** (AWS S3) in cloud-native environments. Why?
*   ✅ **Decoupling:** You can scale Compute (Spark) and Storage (S3) independently.
*   ✅ **Zero Maintenance:** S3 is managed by AWS; HDFS requires a team of engineers.

## Summary Checklist
- ✅ HDFS (Distributed Disks)
- ✅ YARN (Resource Scheduler)
- ✅ MapReduce (Batch Work)
- ✅ Replication (Data Safety)
- ✅ Speculative Execution (Performance)
- ✅ Cloud Migration (HDFS to S3)
