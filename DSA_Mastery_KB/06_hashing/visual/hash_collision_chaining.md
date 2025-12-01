# Hash Collision: Chaining

What happens when two keys hash to the same bucket?
`Hash("John") = 1`
`Hash("Jane") = 1`

## The Solution: Linked Lists (Chaining)
Each bucket holds a Linked List of entries.

```
Bucket 0: [ Null ]
Bucket 1: [ "John" ] -> [ "Jane" ] -> Null
Bucket 2: [ "Bob" ] -> Null
```

## Lookup "Jane"
1.  Compute Hash("Jane") -> 1.
2.  Go to Bucket 1.
3.  Walk the list: "John"? No. "Jane"? Yes!

## Complexity
*   **Best Case**: O(1) (List length is small).
*   **Worst Case**: O(N) (All keys in one bucket).
