# 🧠 Why Hash for O(1) Lookup?

## The Magic of Arrays
Arrays give O(1) access if you know the **Index**.
`arr[5]` is instant.

## The Problem
We want to look up by **Name** (String), not Index (Integer).
`arr["John"]` ???

## The Solution: Hashing
Turn the **Name** into an **Index**.
`"John" --(Hash Function)--> 5`

Now we can do `arr[5]`.
It's like a magic trick that turns any data into an array index.

## The Cost
*   **Space**: You need a big array (buckets) to avoid collisions.
*   **Collisions**: Sometimes two keys map to the same index.
