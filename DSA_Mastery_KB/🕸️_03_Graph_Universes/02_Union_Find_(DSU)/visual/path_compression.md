# Union Find: Path Compression

## The Problem
Without compression, trees get tall. Finding root takes O(N).
`1 -> 2 -> 3 -> 4 -> 5`

## The Solution: Flattening
When we find the root of `1`, we make `1` point DIRECTLY to the root `5`.
Next time, finding root of `1` is O(1).

### Before Find(1)
```
5 (Root)
^
4
^
3
^
2
^
1
```

### After Find(1)
```
   5 (Root)
  / \
 4   1 (Directly connected!)
 ^
 3
 ^
 2
```
**Result**: The tree gets flatter and flatter.
**Time Complexity**: O(α(N)) - Inverse Ackermann Function (Basically constant).
