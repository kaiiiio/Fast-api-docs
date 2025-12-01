def sliding_window_fixed(arr, k):
    """
    Blueprint for Fixed Size Sliding Window (Size = k)
    Time: O(N), Space: O(1)
    """
    current_sum = 0
    max_sum = float('-inf')
    
    # 1. Build first window
    for i in range(k):
        current_sum += arr[i]
    max_sum = current_sum
    
    # 2. Slide
    for i in range(k, len(arr)):
        current_sum += arr[i]     # Add right
        current_sum -= arr[i-k]   # Remove left
        max_sum = max(max_sum, current_sum)
        
    return max_sum

def sliding_window_dynamic(arr, target):
    """
    Blueprint for Dynamic Size Window (Smallest subarray >= target)
    Time: O(N), Space: O(1)
    """
    min_len = float('inf')
    current_sum = 0
    left = 0
    
    for right in range(len(arr)):
        # 1. Expand
        current_sum += arr[right]
        
        # 2. Contract (while valid)
        while current_sum >= target:
            min_len = min(min_len, right - left + 1)
            current_sum -= arr[left]
            left += 1
            
    return min_len if min_len != float('inf') else 0
