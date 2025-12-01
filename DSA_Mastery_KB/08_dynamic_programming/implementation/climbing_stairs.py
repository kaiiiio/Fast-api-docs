def climb_stairs(n):
    """
    Problem: You can take 1 or 2 steps. How many ways to reach top?
    Same as Fibonacci.
    Time: O(N)
    Space: O(1) - Optimized Bottom-Up
    """
    if n <= 2: return n
    
    one_step_before = 2
    two_steps_before = 1
    
    for _ in range(3, n + 1):
        current = one_step_before + two_steps_before
        two_steps_before = one_step_before
        one_step_before = current
        
    return one_step_before

if __name__ == "__main__":
    print(climb_stairs(5)) # 8
