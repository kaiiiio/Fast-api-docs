# 🏭 DSA in Backend Systems (FastAPI/AI)

Why are we learning this? It's not just for interviews.

## 1. 📦 Arrays & Strings
*   **JSON Parsing**: Every API request is a string that needs parsing.
*   **Log Analysis**: Sliding window to detect "5 errors in 1 minute".

## 2. 🔗 HashMaps
*   **Caching**: Redis is basically a giant distributed HashMap.
*   **Database Indexing**: B-Trees (similar concept) for fast lookups.
*   **Deduplication**: Checking if a user email already exists.

## 3. 🌲 Trees & Graphs
*   **Dependency Injection**: FastAPI resolves dependencies as a DAG (Directed Acyclic Graph).
*   **File Systems**: Folders and files are a Tree.
*   **Social Networks**: "Friends of Friends" is a Graph traversal (BFS).

## 4. 📚 Stacks & Queues
*   **Background Jobs**: Celery/RabbitMQ uses Queues.
*   **Undo/Redo**: Text editors use Stacks.
*   **Browser History**: Stack (Back button).

## 5. ⚡ Sorting & Heaps
*   **Leaderboards**: "Top 10 Users" is a Min-Heap or Sorted Set (Redis).
*   **Scheduling**: Priority Queues for "High Priority" emails.
