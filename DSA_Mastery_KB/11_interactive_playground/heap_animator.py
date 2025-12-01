import time
import math

def print_heap_tree(heap, highlight_idx=None):
    """Prints the heap as a tree structure."""
    n = len(heap)
    if n == 0: return
    
    height = int(math.log2(n)) + 1
    width = 2 ** height * 4
    
    print("\n" + "="*width)
    
    for i in range(n):
        level = int(math.log2(i+1))
        indent = width // (2 ** (level + 1))
        
        # Simple level-by-level print (not perfect tree alignment but functional)
        if i == 0 or int(math.log2(i+1)) > int(math.log2(i)):
            print("\n" + " " * (indent - 2), end="")
            
        val_str = str(heap[i])
        if i == highlight_idx:
            val_str = f"[{val_str}]"
            
        print(f"{val_str}".center(6), end=" ")
    print("\n" + "="*width)

def heapify_up(heap, i):
    print(f"Checking index {i} (Val: {heap[i]})...")
    print_heap_tree(heap, highlight_idx=i)
    time.sleep(1)
    
    parent = (i - 1) // 2
    if parent >= 0 and heap[i] < heap[parent]:
        print(f"🔄 Swap {heap[i]} with parent {heap[parent]}")
        heap[i], heap[parent] = heap[parent], heap[i]
        heapify_up(heap, parent)

if __name__ == "__main__":
    heap = [10, 20, 15, 30, 40]
    print("Current Heap:")
    print_heap_tree(heap)
    
    new_val = 5
    print(f"\n➕ Inserting {new_val}...")
    heap.append(new_val)
    heapify_up(heap, len(heap) - 1)
    
    print("\n✅ Final Min Heap:")
    print_heap_tree(heap)
