import time
import os

def visualize_dp_grid(rows, cols):
    dp = [[0] * cols for _ in range(rows)]
    
    print("🕸️ DP GRID FILLER (Unique Paths)")
    print("--------------------------------")
    
    for r in range(rows):
        for c in range(cols):
            if r == 0 or c == 0:
                dp[r][c] = 1
            else:
                dp[r][c] = dp[r-1][c] + dp[r][c-1]
            
            print_grid(dp, r, c)
            time.sleep(0.5)

def print_grid(dp, curr_r, curr_c):
    os.system('cls' if os.name == 'nt' else 'clear')
    print("🕸️ DP GRID FILLER (Unique Paths)")
    
    for r in range(len(dp)):
        row_str = ""
        for c in range(len(dp[0])):
            val = dp[r][c]
            if r == curr_r and c == curr_c:
                row_str += f"[{val:2}] " # Highlight current
            elif val == 0:
                row_str += " .   "
            else:
                row_str += f" {val:2}  "
        print(row_str)

if __name__ == "__main__":
    visualize_dp_grid(4, 5)
