def fib_memo(n, memo={}):
    """
    Top-Down (Recursion + Memoization)
    """
    if n in memo: return memo[n]
    if n <= 1: return n
    
    memo[n] = fib_memo(n-1, memo) + fib_memo(n-2, memo)
    return memo[n]

def fib_tabulation(n):
    """
    Bottom-Up (Iteration + Table)
    """
    if n <= 1: return n
    dp = [0] * (n + 1)
    dp[1] = 1
    
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
        
    return dp[n]

if __name__ == "__main__":
    print(fib_memo(10))      # 55
    print(fib_tabulation(10)) # 55
