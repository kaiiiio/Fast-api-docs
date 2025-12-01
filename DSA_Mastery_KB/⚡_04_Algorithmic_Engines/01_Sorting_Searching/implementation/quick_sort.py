import random

def quick_sort(arr):
    """
    Time: O(N log N) avg, O(N^2) worst
    Space: O(log N) stack
    Stable: No
    """
    if len(arr) <= 1:
        return arr
        
    pivot = random.choice(arr)
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)
