# LRU Cache: The Design

**Goal**: O(1) Get and O(1) Put.
**Eviction Policy**: Remove the Least Recently Used item when full.

## The Data Structure: HashMap + Doubly Linked List
*   **HashMap**: `Key -> Node`. Allows O(1) access.
*   **Doubly Linked List**: Maintains order.
    *   **Head**: Most Recently Used (MRU).
    *   **Tail**: Least Recently Used (LRU).

## Visual
```
      HashMap
    +---+---+
    | A | * |-----> [ Node A ] <---> [ Node B ] <---> [ Node C ]
    | B | * |----->
    | C | * |----->   ^                                   ^
    +---+---+        Head (MRU)                          Tail (LRU)
```

## Operations
1.  **Get(A)**:
    *   Look up A in Map.
    *   Move Node A to **Head**.
2.  **Put(D)** (Capacity Full):
    *   Remove **Tail** (Node C) from List and Map.
    *   Add Node D to **Head**.
    *   Add D to Map.
