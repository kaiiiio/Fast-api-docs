class ListNode:
    def __init__(self, val=0, next=None, prev=None):
        self.val = val
        self.next = next
        self.prev = prev

class DoublyLinkedList:
    """
    Pros: O(1) deletion if you have the node reference.
    Cons: 2x memory for pointers.
    """
    def __init__(self):
        self.head = None
        self.tail = None
        
    def add_at_tail(self, val):
        new_node = ListNode(val)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            new_node.prev = self.tail
            self.tail = new_node
            
    def remove_node(self, node):
        # O(1) - The magic of DLL
        if node.prev:
            node.prev.next = node.next
        else:
            self.head = node.next
            
        if node.next:
            node.next.prev = node.prev
        else:
            self.tail = node.prev
