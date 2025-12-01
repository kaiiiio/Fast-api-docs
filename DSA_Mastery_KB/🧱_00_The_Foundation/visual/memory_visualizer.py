import sys
import time

def visualize_memory():
    print("🧠 MEMORY VISUALIZER 🧠")
    print("-------------------------")
    
    stack = []
    heap = {}
    
    # 1. Stack Allocation
    print("\n[CPU] Executing: int x = 10")
    stack.append({"name": "x", "val": 10, "addr": "0x100"})
    print_state(stack, heap)
    time.sleep(1)
    
    # 2. Heap Allocation
    print("\n[CPU] Executing: User u = new User('Alice')")
    heap_addr = "0x500"
    heap[heap_addr] = {"name": "Alice", "age": 25}
    stack.append({"name": "u", "val": heap_addr, "addr": "0x104"})
    print_state(stack, heap)
    time.sleep(1)
    
    # 3. Reference Copy
    print("\n[CPU] Executing: User u2 = u")
    stack.append({"name": "u2", "val": heap_addr, "addr": "0x108"})
    print_state(stack, heap)
    
def print_state(stack, heap):
    print("\nSTACK (LIFO) 🥞")
    for item in reversed(stack):
        print(f"| {item['addr']} | {item['name']} = {item['val']} |")
    print("+-----------------+")
    
    print("\nHEAP (Random Access) 📦")
    for addr, obj in heap.items():
        print(f"| {addr} | {obj} |")
    print("+-----------------+")

if __name__ == "__main__":
    visualize_memory()
