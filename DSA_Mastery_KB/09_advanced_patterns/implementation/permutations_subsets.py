def permutations(nums):
    """
    Time: O(N!)
    """
    result = []
    
    def backtrack(path, remaining):
        if not remaining:
            result.append(path[:])
            return
            
        for i in range(len(remaining)):
            # Choose
            val = remaining[i]
            path.append(val)
            
            # Explore
            new_remaining = remaining[:i] + remaining[i+1:]
            backtrack(path, new_remaining)
            
            # Un-choose
            path.pop()
            
    backtrack([], nums)
    return result

def subsets(nums):
    """
    Time: O(2^N)
    """
    result = []
    
    def backtrack(start, path):
        result.append(path[:])
        
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
            
    backtrack(0, [])
    return result

if __name__ == "__main__":
    print("Permutations:", permutations([1, 2, 3]))
    print("Subsets:", subsets([1, 2]))
