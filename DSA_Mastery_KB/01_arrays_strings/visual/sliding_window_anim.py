import time
import os

def animate_sliding_window(arr, k):
    print("📺 SLIDING WINDOW ANIMATION (Fixed Size k=3)")
    print(f"Array: {arr}")
    print("------------------------------------------")
    
    current_sum = 0
    
    # 1. Build First Window
    for i in range(k):
        current_sum += arr[i]
        
    print_frame(arr, 0, k-1, current_sum)
    time.sleep(1)
    
    # 2. Slide
    for i in range(k, len(arr)):
        # Remove left
        left_val = arr[i-k]
        current_sum -= left_val
        
        # Add right
        right_val = arr[i]
        current_sum += right_val
        
        print_frame(arr, i-k+1, i, current_sum)
        time.sleep(1)

def print_frame(arr, start, end, current_sum):
    os.system('cls' if os.name == 'nt' else 'clear')
    print("📺 SLIDING WINDOW ANIMATION (Fixed Size k=3)")
    
    # Print Array
    line = ""
    for idx, val in enumerate(arr):
        if start <= idx <= end:
            line += f"[{val}] "
        else:
            line += f" {val}  "
    print(f"\n{line}")
    
    # Print Pointer
    pointer = " " * (start * 4) + "^" + "-" * ((end-start)*4) + "^"
    print(pointer)
    
    print(f"\nWindow Sum: {current_sum}")

if __name__ == "__main__":
    animate_sliding_window([1, 4, 2, 10, 23, 3, 1, 0, 20], 3)
