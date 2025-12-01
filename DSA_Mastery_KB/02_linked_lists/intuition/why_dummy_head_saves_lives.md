# 🧠 Why Dummy Head Saves Lives

Linked List edge cases are annoying.
*   Deleting the **head**? You need a special `if`.
*   Inserting before the **head**? You need a special `if`.

## The Solution: The Dummy Head
Create a fake node that points to the real head.
`Dummy -> Head -> Node -> ...`

Now, "Head" is just `Dummy.next`.
You never have to touch the "real" head variable directly.

### Without Dummy
```python
def delete_val(head, val):
    if head and head.val == val:
        return head.next # Special case for head
    
    curr = head
    while curr and curr.next:
        if curr.next.val == val:
            curr.next = curr.next.next
        else:
            curr = curr.next
    return head
```

### With Dummy
```python
def delete_val(head, val):
    dummy = ListNode(0)
    dummy.next = head
    curr = dummy
    
    while curr.next:
        if curr.next.val == val:
            curr.next = curr.next.next
        else:
            curr = curr.next
            
    return dummy.next # Always returns the new head
```
**Result**: No special `if` for the head. The logic is uniform.
