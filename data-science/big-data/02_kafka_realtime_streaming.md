# Real-time Streaming (Kafka): Senior Guide

## 1. What is Kafka? (Theory)
Apache Kafka is a **Distributed Streaming Platform** that stores and processes millions of events per second in real-time.
*   **The Concept:** It's an **Append-Only** commit log. Producers send data; Consumers pull data.
*   **Decoupling:** Producer doesn't need to know who the Consumer is. Very important for microservices.
*   **Retention:** Unlike a MQ (RabbitMQ), Kafka stores the data for a configurable time (e.g., 7 days), so you can **Replay** older data as needed.

## 2. Kafka Architecture Diagram
```mermaid
graph LR
    A[Producer (Mobile App)] --> B[Topic: logins]
    B --> C[Partition 0]
    B --> D[Partition 1]
    B --> E[Partition 2]
    C --> F[Consumer Group (Security)]
    D --> G[Consumer Group (Analytics)]
    E --> G
```

## 3. High-level Design (Senior Path)
1.  **Topics & Partitions:** A Topic is like a category (e.g., "orders"). A Topic is split into **Partitions** for parallelism.
    - **Key-based Partitioning:** If you send the same `user_id` as the key, all orders for that user always go to the **Same Partition** (Order preservation). 
2.  **Consumer Groups:** Multiple consumers pulling data together. 
    - **Rule:** A single Partition can only be read by **one** consumer in a group at a time.
    - **Rebalancing:** If a consumer dies, Kafka automatically gives its Partition to another consumer.
3.  **Offsets:** A simple number (e.g., `12,852`) that tells Kafka how much data the consumer has already read.

## 4. Key Performance Concepts
*   **ISR (In-Sync Replicas):** The list of active copies of your data on different servers.
*   **Batching:** Producers send 1,000 messages at once (efficient) instead of 1 by 1 (slow).
*   **Compression:** Using **Snappy** or **Zstd** to reduce the size of data before sending over the network.

## 5. Summary Implementation (Minimalist)
```python
from kafka import KafkaProducer, KafkaConsumer

# Producer
p = KafkaProducer(bootstrap_servers='localhost:9092')
p.send('sensor_data', b'{"temp": 25.4}')

# Consumer
c = KafkaConsumer('sensor_data', group_id='monitor_group')
for msg in c:
    process_iot_data(msg.value)
```

## Summary Checklist
- ✅ Topic (Category)
- ✅ Partition (Parallelism)
- ✅ Offset (Progress)
- ✅ Consumer Group (Throughput)
- ✅ Retention (History)
- ✅ Batching (Efficiency)
