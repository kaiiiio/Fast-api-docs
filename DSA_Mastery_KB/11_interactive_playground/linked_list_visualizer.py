import time

class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def print_list(head, highlight_node=None):
    """Prints the list with ASCII art, highlighting a specific node."""
    curr = head
    nodes = []
    while curr:
        val_str = f"[{curr.val}]"
        if curr == highlight_node:
            val_str = f"\033[92m{val_str}\033[0m" # Green
        nodes.append(val_str)
        curr = curr.next
    nodes.append("None")
    print(" -> ".join(nodes))

def visualize_traversal(head):
    print("\n🚀 Starting Traversal...")
    curr = head
    while curr:
        print_list(head, highlight_node=curr)
        time.sleep(1.0)
        curr = curr.next
    print_list(head, highlight_node=None)
    print("✅ Done!")

if __name__ == "__main__":
    # Setup
    head = Node(10)
    head.next = Node(20)
    head.next.next = Node(30)
    head.next.next.next = Node(40)
    
    visualize_traversal(head)
