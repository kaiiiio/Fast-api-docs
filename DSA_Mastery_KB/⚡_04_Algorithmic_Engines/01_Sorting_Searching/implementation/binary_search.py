def binary_search(arr, target):
    """
    Time: O(log N)
    Space: O(1)
    Pre-req: Array MUST be sorted.
    """
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
            
    return -1
