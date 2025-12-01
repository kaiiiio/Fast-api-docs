# Heap: Array vs Tree

## Tree View
```
      10
     /  \
   20    30
```

## Array View
`[10, 20, 30]`

## Index Math
*   Left Child: `2*i + 1`
*   Right Child: `2*i + 2`
*   Parent: `(i-1) // 2`

This allows us to represent a tree without pointers!
