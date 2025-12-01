import time

def visualize_merge_sort(arr, depth=0):
    indent = "  " * depth
    print(f"{indent}⬇️ Splitting: {arr}")
    time.sleep(0.5)
    
    if len(arr) <= 1:
        print(f"{indent}✅ Base Case: {arr}")
        return arr
        
    mid = len(arr) // 2
    left = visualize_merge_sort(arr[:mid], depth+1)
    right = visualize_merge_sort(arr[mid:], depth+1)
    
    print(f"{indent}🔄 Merging {left} and {right}")
    merged = merge(left, right)
    print(f"{indent}⬆️ Result: {merged}")
    time.sleep(0.5)
    return merged

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

if __name__ == "__main__":
    arr = [38, 27, 43, 3]
    print("🧩 MERGE SORT VISUALIZER")
    visualize_merge_sort(arr)
