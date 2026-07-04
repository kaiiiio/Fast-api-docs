# Structured Logging: Minimal Guide

## Core Concepts
*   **Definition:** Logs in a machine-readable format (JSON) with key-value pairs (e.g., `user_id`, `event`).
*   **Structured Output:** Standard for production (ELKStack/CloudWatch/Grafana Loki).
*   **Structlog:** Best library for structured logging in Python.

## Implementation Details
*   **`logger.bind(correlation_id=request_id)`:** Injects a shared ID for all logs in a single request lifecycle.
*   **`structlog.contextvars.bind_contextvars()`:** Modern way to handle per-request context automatically.

## Best Practices
- ✅ Standardize **Field Names** (e.g., always `user_id`, not `id` or `uid`).
- ✅ Use **JSON Output** in production; use **Console Output** (Pretty print) in dev.
- ✅ Always include **Correlation ID** to trace requests across microservices.
- ✅ Log at appropriate **Levels** (e.g., `INFO` for flow, `ERROR` for crashes).

## Summary Checklist
- ✅ Structlog configured
- ✅ JSON output in production
- ✅ Correlation ID per request
- ✅ Standardized key names