def two_pointers_opposite(arr, target):
    """
    Blueprint for Two Pointers (Sorted Array) - e.g., Two Sum II
    Time: O(N), Space: O(1)
    """
    left = 0
    right = len(arr) - 1
    
    while left < right:
        current_sum = arr[left] + arr[right]
        
        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1  # Need bigger sum
        else:
            right -= 1 # Need smaller sum
            
    return []

def two_pointers_equidirectional(arr):
    """
    Blueprint for Fast/Slow Pointers (e.g., Remove Duplicates)
    Time: O(N), Space: O(1)
    """
    slow = 0
    
    for fast in range(len(arr)):
        if arr[fast] != arr[slow]:
            slow += 1
            arr[slow] = arr[fast]
            
    return slow + 1
