def subsets(nums):
    """
    Backtracking to find all subsets (Power Set).
    """
    res = []
    
    def backtrack(start, path):
        res.append(path[:])
        
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop() # Backtrack
            
    backtrack(0, [])
    return res

def dailyTemperatures(temperatures):
    """
    Monotonic Stack.
    """
    res = [0] * len(temperatures)
    stack = [] # (index, temp)
    
    for i, t in enumerate(temperatures):
        while stack and t > stack[-1][1]:
            stack_i, stack_t = stack.pop()
            res[stack_i] = i - stack_i
        stack.append((i, t))
        
    return res
