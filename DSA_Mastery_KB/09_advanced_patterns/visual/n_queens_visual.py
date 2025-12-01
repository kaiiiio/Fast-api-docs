import time
import os

def solve_n_queens(n):
    board = [['.' for _ in range(n)] for _ in range(n)]
    print(f"👑 N-QUEENS VISUALIZER (N={n})")
    backtrack(board, 0, n)

def backtrack(board, row, n):
    if row == n:
        print_board(board, "✅ SOLUTION FOUND!")
        time.sleep(2)
        return
        
    for col in range(n):
        if is_safe(board, row, col, n):
            board[row][col] = 'Q'
            print_board(board, f"Placing Queen at ({row}, {col})")
            time.sleep(0.5)
            
            backtrack(board, row + 1, n)
            
            board[row][col] = '.' # Backtrack
            print_board(board, f"🔙 Backtracking from ({row}, {col})")
            time.sleep(0.5)

def is_safe(board, row, col, n):
    # Check column
    for i in range(row):
        if board[i][col] == 'Q': return False
        
    # Check diagonals
    for i, j in zip(range(row, -1, -1), range(col, -1, -1)):
        if board[i][j] == 'Q': return False
    for i, j in zip(range(row, -1, -1), range(col, n)):
        if board[i][j] == 'Q': return False
        
    return True

def print_board(board, status):
    os.system('cls' if os.name == 'nt' else 'clear')
    print(f"👑 N-QUEENS: {status}")
    print("-----------------------")
    for row in board:
        print(" ".join(row))

if __name__ == "__main__":
    solve_n_queens(4)
