import time
import os

def factorial(n, depth=0):
    indent = "  " * depth
    print_stack(n, depth, "PUSH")
    time.sleep(1)
    
    if n <= 1:
        print(f"{indent}Base Case Reached! Returning 1")
        print_stack(n, depth, "POP")
        time.sleep(1)
        return 1
        
    print(f"{indent}Computing {n} * factorial({n-1})")
    result = n * factorial(n-1, depth+1)
    
    print(f"{indent}Returning {result}")
    print_stack(n, depth, "POP")
    time.sleep(1)
    return result

def print_stack(n, depth, action):
    # os.system('cls' if os.name == 'nt' else 'clear')
    print(f"\n🥞 STACK OPERATION: {action} Frame(n={n})")
    print("Stack State:")
    for i in range(depth, -1, -1):
        print(f"| Frame n={n- (depth-i)} |")
    print("+--------------+")

if __name__ == "__main__":
    print("🚀 Calculating Factorial(3)...")
    factorial(3)
