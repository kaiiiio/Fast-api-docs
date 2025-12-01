# Job Scheduler: Priority Queue

**Goal**: Execute jobs based on Priority, not Arrival Time.
"Critical Security Patch" > "Weekly Email Report".

## The Data Structure: Min Heap (or Max Heap)
Store jobs as `(Priority, Timestamp, JobID)`.

## The Loop
1.  Worker checks Heap.
2.  `Pop()` the highest priority job.
3.  Execute it.

## Why Heap?
*   **Insert**: O(log N). Fast to add new jobs.
*   **Get Best**: O(1). Instant access to the most important task.
