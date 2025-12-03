// Context: You are building a monitoring tool (like Datadog). You have 5,000 servers sending CPU/RAM metrics every 10 seconds. That is 500,000 writes per second.

// The Bug: Your Postgres database is at 100% CPU. It cannot ingest rows fast enough. The disk I/O is saturated (IOPS bottleneck). Your API is returning 503 Service Unavailable.

// The Task: Architect a storage layer that can handle High Write Throughput without crashing.