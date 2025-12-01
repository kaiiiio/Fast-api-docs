import time

def visualize_quick_sort(arr):
    print(f"\n⚡ QUICK SORT: {arr}")
    if len(arr) <= 1:
        return arr
        
    pivot = arr[len(arr) // 2]
    print(f"🎯 Pivot selected: {pivot}")
    
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    print(f"   Left (<{pivot}): {left}")
    print(f"   Middle (={pivot}): {middle}")
    print(f"   Right (>{pivot}): {right}")
    time.sleep(1)
    
    return visualize_quick_sort(left) + middle + visualize_quick_sort(right)

if __name__ == "__main__":
    arr = [10, 7, 8, 9, 1, 5]
    print("Sorted:", visualize_quick_sort(arr))
