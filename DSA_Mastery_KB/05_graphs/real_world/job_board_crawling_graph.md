# 🌍 Real World: Job Board Crawling

**Scenario**: You are building a Job Aggregator.
You start at `indeed.com`. It links to `company.com/careers`. That links to `linkedin.com/job`.

This is a **Graph Traversal**.

## The Algorithm: BFS (Web Crawler)
We want to visit pages layer by layer.

1.  **Queue**: URLs to visit. Start with `[indeed.com]`.
2.  **Visited Set**: Keep track of URLs to avoid infinite loops (Cycles!).
3.  **Process**:
    *   Dequeue URL.
    *   Download HTML.
    *   Extract links.
    *   If link not in Visited, Enqueue.

## Challenges
*   **Cycles**: A links to B, B links to A. (Solved by Visited Set).
*   **Scale**: The web is infinite. Limit depth or domain.
