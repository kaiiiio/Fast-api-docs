import time
import os

def visualize_heapify(arr):
    print("🌋 HEAPIFY VISUALIZATION (Min Heap)")
    print(f"Initial Array: {arr}")
    print("-----------------------------------")
    
    n = len(arr)
    # Start from last non-leaf node
    for i in range(n // 2 - 1, -1, -1):
        sift_down(arr, n, i)
        
    print(f"\n✅ Final Heap: {arr}")

def sift_down(arr, n, i):
    smallest = i
    left = 2 * i + 1
    right = 2 * i + 2
    
    print(f"\nChecking Node index {i} (Val: {arr[i]})")
    
    if left < n and arr[left] < arr[smallest]:
        smallest = left
        
    if right < n and arr[right] < arr[smallest]:
        smallest = right
        
    if smallest != i:
        print(f"⬇️ Swapping {arr[i]} with {arr[smallest]}")
        arr[i], arr[smallest] = arr[smallest], arr[i]
        print(f"Current Array: {arr}")
        time.sleep(1)
        sift_down(arr, n, smallest)

if __name__ == "__main__":
    # [10, 5, 20, 2, 4] -> Min Heap
    arr = [10, 5, 20, 2, 4]
    visualize_heapify(arr)
