class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class SinglyLinkedList:
    def __init__(self):
        self.head = None
        self.size = 0
        
    def add_at_head(self, val):
        # O(1) - No shifting needed
        new_node = ListNode(val)
        new_node.next = self.head
        self.head = new_node
        self.size += 1
        
    def add_at_tail(self, val):
        # O(N) - Must traverse to end (unless we keep a tail pointer)
        new_node = ListNode(val)
        if not self.head:
            self.head = new_node
            return
            
        curr = self.head
        while curr.next:
            curr = curr.next
        curr.next = new_node
        self.size += 1
        
    def delete_at_index(self, index):
        # O(N) - Traversal
        if index < 0 or index >= self.size: return
        
        if index == 0:
            self.head = self.head.next
        else:
            curr = self.head
            for _ in range(index - 1):
                curr = curr.next
            curr.next = curr.next.next
            
        self.size -= 1
