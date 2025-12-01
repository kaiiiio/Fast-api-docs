class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Queue:
    """
    FIFO (First In First Out) - Like a line at Starbucks.
    Implemented using Linked List for O(1) Enqueue/Dequeue.
    (Array implementation requires O(N) shift on dequeue unless circular).
    """
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0
        
    def enqueue(self, val):
        new_node = ListNode(val)
        if not self.tail:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            self.tail = new_node
        self.size += 1
        
    def dequeue(self):
        if not self.head: return None
        
        val = self.head.val
        self.head = self.head.next
        if not self.head:
            self.tail = None
            
        self.size -= 1
        return val
