# Singly Linked List: The Chain

Each node holds a **Value** and a **Pointer** to the next node.

```
[ Address: 0x100 ]      [ Address: 0x200 ]      [ Address: 0x300 ]
+-------+------+       +-------+------+       +-------+------+
| Val: 1| Next |------>| Val: 2| Next |------>| Val: 3| None |
+-------+------+       +-------+------+       +-------+------+
```

## Key Characteristics
*   **Head**: The first node (0x100). If you lose this, you lose the list.
*   **Tail**: The last node. Points to `None`.
*   **Access**: O(N). You must walk from Head to find the 3rd element.
