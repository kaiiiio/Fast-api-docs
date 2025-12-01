# Rate Limiter: Sliding Window Log

**Goal**: Limit user to 100 requests per minute.

## The Algorithm
1.  Keep a **Sorted Set** (or List) of timestamps for each user.
2.  When a request comes in at time `T`:
    *   Remove all timestamps smaller than `T - 60 seconds`.
    *   Count remaining timestamps.
    *   If `Count < Limit`: Allow request, Add `T`.
    *   Else: Reject.

## Redis Implementation
Use `ZSET`.
*   `ZREMRANGEBYSCORE key -inf (T - 60)`
*   `ZCARD key`
*   `ZADD key T T`
