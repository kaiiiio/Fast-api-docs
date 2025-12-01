def knapsack_01(weights, values, capacity):
    """
    Classic 0/1 Knapsack Problem.
    Time: O(N * W)
    Space: O(N * W)
    """
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            weight = weights[i-1]
            value = values[i-1]
            
            if weight <= w:
                # Max of: (Include Item) vs (Exclude Item)
                include = value + dp[i-1][w-weight]
                exclude = dp[i-1][w]
                dp[i][w] = max(include, exclude)
            else:
                # Cannot include
                dp[i][w] = dp[i-1][w]
                
    return dp[n][capacity]

if __name__ == "__main__":
    w = [1, 2, 3]
    v = [10, 15, 40]
    cap = 6
    print(knapsack_01(w, v, cap)) # 55
