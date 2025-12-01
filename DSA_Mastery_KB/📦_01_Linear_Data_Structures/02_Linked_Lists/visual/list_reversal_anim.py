import time
import os

class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def animate_reversal(head):
    prev = None
    curr = head
    
    print_list(head, prev, curr, "Initial State")
    time.sleep(2)
    
    while curr:
        next_temp = curr.next
        
        # Visualize the break
        print_list(head, prev, curr, f"Breaking link: {curr.val} -> {next_temp.val if next_temp else 'None'}")
        time.sleep(1)
        
        curr.next = prev
        
        # Visualize the new link
        print_list(head, prev, curr, f"New link: {curr.val} -> {prev.val if prev else 'None'}")
        time.sleep(1)
        
        prev = curr
        curr = next_temp
        
    print_list(prev, prev, curr, "Reversal Complete")

def print_list(head, prev, curr, status):
    os.system('cls' if os.name == 'nt' else 'clear')
    print(f"📺 LINKED LIST REVERSAL: {status}")
    print("------------------------------------------------")
    
    # This is a simplified visualizer that just prints status
    # A real one would traverse and print ASCII arrows
    print(f"PREV: {prev.val if prev else 'None'}")
    print(f"CURR: {curr.val if curr else 'None'}")
    
if __name__ == "__main__":
    # 1 -> 2 -> 3
    head = Node(1)
    head.next = Node(2)
    head.next.next = Node(3)
    
    animate_reversal(head)
