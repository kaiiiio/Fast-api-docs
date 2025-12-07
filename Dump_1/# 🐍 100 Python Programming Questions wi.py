# 🐍 100 Python Programming Questions with Answers

## **Basic Level (1-20)**

**1️⃣ Check if a number is prime**
```python
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

print(is_prime(17))  # True
```

**2️⃣ Reverse a number**
```python
def reverse_number(n):
    return int(str(abs(n))[::-1]) * (-1 if n < 0 else 1)   #DB

print(reverse_number(12345))  # 54321
```

**3️⃣ Count vowels in a string**
```python
def count_vowels(s):
    return sum(1 for c in s.lower() if c in 'aeiou')

print(count_vowels("Hello World"))  # 3
```

**4️⃣ Find maximum subarray sum (Kadane's Algorithm)**
```python
def max_subarray_sum(arr):
    max_sum = current_sum = arr[0]
    for num in arr[1:]:
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)
    return max_sum

print(max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6
```

**5️⃣ Remove duplicates from list**
```python
def remove_duplicates(lst):
    return list(dict.fromkeys(lst))

print(remove_duplicates([1, 2, 2, 3, 4, 4, 5]))  # [1, 2, 3, 4, 5]
```

**6️⃣ Check if string is palindrome**
```python
def is_palindrome(s):
    s = ''.join(c.lower() for c in s if c.isalnum())
    return s == s[::-1]

print(is_palindrome("A man a plan a canal Panama"))  # True
```

**7️⃣ Find factorial of a number**
```python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
```

**8️⃣ Generate Fibonacci sequence**
```python
def fibonacci(n):
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[-1] + fib[-2])
    return fib[:n]

print(fibonacci(10))  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

**9️⃣ Find GCD of two numbers**
```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

print(gcd(48, 18))  # 6
```

**🔟 Find LCM of two numbers**
```python
def lcm(a, b):
    return abs(a * b) // gcd(a, b)

print(lcm(12, 15))  # 60
```

**1️⃣1️⃣ Check if number is Armstrong**
```python
def is_armstrong(n):
    digits = str(n)
    power = len(digits)
    return n == sum(int(d)**power for d in digits)

print(is_armstrong(153))  # True
```

**1️⃣2️⃣ Sum of digits**
```python
def sum_of_digits(n):
    return sum(int(d) for d in str(abs(n)))

print(sum_of_digits(12345))  # 15
```

**1️⃣3️⃣ Check if number is perfect square**
```python
def is_perfect_square(n):
    return int(n**0.5)**2 == n

print(is_perfect_square(16))  # True
```

**1️⃣4️⃣ Convert binary to decimal**
```python
def binary_to_decimal(binary):
    return int(binary, 2)

print(binary_to_decimal('1010'))  # 10
```

**1️⃣5️⃣ Convert decimal to binary**
```python
def decimal_to_binary(n):
    return bin(n)[2:]

print(decimal_to_binary(10))  # '1010'
```

**1️⃣6️⃣ Find second largest in list**
```python
def second_largest(lst):
    unique = list(set(lst))
    unique.sort()
    return unique[-2] if len(unique) >= 2 else None

print(second_largest([10, 20, 4, 45, 99]))  # 45
```

**1️⃣7️⃣ Count frequency of elements**
```python
def count_frequency(lst):
    freq = {}
    for item in lst:
        freq[item] = freq.get(item, 0) + 1
    return freq

print(count_frequency([1, 2, 2, 3, 3, 3]))  # {1: 1, 2: 2, 3: 3}
```

**1️⃣8️⃣ Swap two variables without temp**
```python
def swap(a, b):
    a, b = b, a
    return a, b

print(swap(5, 10))  # (10, 5)
```

**1️⃣9️⃣ Check if string is anagram**
```python
def is_anagram(s1, s2):
    return sorted(s1.lower()) == sorted(s2.lower())

print(is_anagram("listen", "silent"))  # True
```

**2️⃣0️⃣ Find missing number in array**
```python
def find_missing(arr, n):
    total = n * (n + 1) // 2
    return total - sum(arr)

print(find_missing([1, 2, 4, 5, 6], 6))  # 3
```

## **Intermediate Level (21-50)**

**2️⃣1️⃣ Merge two sorted arrays**
```python
def merge_sorted(arr1, arr2):
    result = []
    i = j = 0
    while i < len(arr1) and j < len(arr2):
        if arr1[i] < arr2[j]:
            result.append(arr1[i])
            i += 1
        else:
            result.append(arr2[j])
            j += 1
    result.extend(arr1[i:])
    result.extend(arr2[j:])
    return result

print(merge_sorted([1, 3, 5], [2, 4, 6]))  # [1, 2, 3, 4, 5, 6]
```

**2️⃣2️⃣ Binary search**
```python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

print(binary_search([1, 2, 3, 4, 5], 3))  # 2
```

**2️⃣3️⃣ Bubble sort**
```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

print(bubble_sort([64, 34, 25, 12, 22]))  # [12, 22, 25, 34, 64]
```

**2️⃣4️⃣ Selection sort**
```python
def selection_sort(arr):
    for i in range(len(arr)):
        min_idx = i
        for j in range(i+1, len(arr)):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr

print(selection_sort([64, 25, 12, 22, 11]))  # [11, 12, 22, 25, 64]
```

**2️⃣5️⃣ Insertion sort**
```python
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

print(insertion_sort([12, 11, 13, 5, 6]))  # [5, 6, 11, 12, 13]
```

**2️⃣6️⃣ Find longest substring without repeating characters**
```python
def longest_substring(s):
    char_set = set()
    left = max_len = 0
    for right in range(len(s)):
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(s[right])
        max_len = max(max_len, right - left + 1)
    return max_len

print(longest_substring("abcabcbb"))  # 3
```

**2️⃣7️⃣ Two sum problem**
```python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

print(two_sum([2, 7, 11, 15], 9))  # [0, 1]
```

**2️⃣8️⃣ Valid parentheses**
```python
def is_valid_parentheses(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            stack.append(char)
    return len(stack) == 0

print(is_valid_parentheses("()[]{}"))  # True
```

**2️⃣9️⃣ Rotate array**
```python
def rotate_array(arr, k):
    k = k % len(arr)
    return arr[-k:] + arr[:-k]

print(rotate_array([1, 2, 3, 4, 5], 2))  # [4, 5, 1, 2, 3]
```

**3️⃣0️⃣ Find intersection of two arrays**
```python
def intersection(arr1, arr2):
    return list(set(arr1) & set(arr2))

print(intersection([1, 2, 2, 1], [2, 2]))  # [2]
```

**3️⃣1️⃣ Find union of two arrays**
```python
def union(arr1, arr2):
    return list(set(arr1) | set(arr2))

print(union([1, 2, 3], [2, 3, 4]))  # [1, 2, 3, 4]
```

**3️⃣2️⃣ Move zeros to end**
```python
def move_zeros(arr):
    non_zero = [x for x in arr if x != 0]
    zeros = [0] * (len(arr) - len(non_zero))
    return non_zero + zeros

print(move_zeros([0, 1, 0, 3, 12]))  # [1, 3, 12, 0, 0]
```

**3️⃣3️⃣ Find all pairs with given sum**
```python
def find_pairs(arr, target):
    pairs = []
    seen = set()
    for num in arr:
        complement = target - num
        if complement in seen:
            pairs.append((complement, num))
        seen.add(num)
    return pairs

print(find_pairs([1, 5, 7, -1, 5], 6))  # [(1, 5), (7, -1), (1, 5)]
```

**3️⃣4️⃣ Check if array is sorted**
```python
def is_sorted(arr):
    return all(arr[i] <= arr[i+1] for i in range(len(arr)-1))

print(is_sorted([1, 2, 3, 4, 5]))  # True
```

**3️⃣5️⃣ Reverse words in string**
```python
def reverse_words(s):
    return ' '.join(s.split()[::-1])

print(reverse_words("Hello World Python"))  # "Python World Hello"
```

**3️⃣6️⃣ Count characters in string**
```python
def count_chars(s):
    return {char: s.count(char) for char in set(s)}

print(count_chars("hello"))  # {'h': 1, 'e': 1, 'l': 2, 'o': 1}
```

**3️⃣7️⃣ Remove vowels from string**
```python
def remove_vowels(s):
    return ''.join(c for c in s if c.lower() not in 'aeiou')

print(remove_vowels("Hello World"))  # "Hll Wrld"
```

**3️⃣8️⃣ Check if power of two**
```python
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

print(is_power_of_two(16))  # True
```

**3️⃣9️⃣ Find single number (all others appear twice)**
```python
def single_number(nums):
    result = 0
    for num in nums:
        result ^= num
    return result

print(single_number([4, 1, 2, 1, 2]))  # 4
```

**4️⃣0️⃣ Flatten nested list**
```python
def flatten(nested_list):
    result = []
    for item in nested_list:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result

print(flatten([1, [2, 3], [[4], 5]]))  # [1, 2, 3, 4, 5]
```

**4️⃣1️⃣ Find majority element**
```python
def majority_element(nums):
    count = 0
    candidate = None
    for num in nums:
        if count == 0:
            candidate = num
        count += 1 if num == candidate else -1
    return candidate

print(majority_element([3, 2, 3]))  # 3
```

**4️⃣2️⃣ Longest common prefix**
```python
def longest_common_prefix(strs):
    if not strs:
        return ""
    prefix = strs[0]
    for s in strs[1:]:
        while not s.startswith(prefix):
            prefix = prefix[:-1]
            if not prefix:
                return ""
    return prefix

print(longest_common_prefix(["flower", "flow", "flight"]))  # "fl"
```

**4️⃣3️⃣ Check if subsequence**
```python
def is_subsequence(s, t):
    i = 0
    for char in t:
        if i < len(s) and s[i] == char:
            i += 1
    return i == len(s)

print(is_subsequence("abc", "ahbgdc"))  # True
```

**4️⃣4️⃣ Remove adjacent duplicates**
```python
def remove_adjacent_duplicates(s):
    stack = []
    for char in s:
        if stack and stack[-1] == char:
            stack.pop()
        else:
            stack.append(char)
    return ''.join(stack)

print(remove_adjacent_duplicates("abbaca"))  # "ca"
```

**4️⃣5️⃣ Count primes up to n**
```python
def count_primes(n):
    if n <= 2:
        return 0
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(n**0.5) + 1):
        if is_prime[i]:
            for j in range(i*i, n, i):
                is_prime[j] = False
    return sum(is_prime)

print(count_primes(10))  # 4
```

**4️⃣6️⃣ Find peak element**
```python
def find_peak(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        mid = (left + right) // 2
        if arr[mid] < arr[mid + 1]:
            left = mid + 1
        else:
            right = mid
    return left

print(find_peak([1, 2, 3, 1]))  # 2
```

**4️⃣7️⃣ Product of array except self**
```python
def product_except_self(nums):
    n = len(nums)
    result = [1] * n
    left = 1
    for i in range(n):
        result[i] = left
        left *= nums[i]
    right = 1
    for i in range(n-1, -1, -1):
        result[i] *= right
        right *= nums[i]
    return result

print(product_except_self([1, 2, 3, 4]))  # [24, 12, 8, 6]
```

**4️⃣8️⃣ Find first unique character**
```python
def first_unique_char(s):
    count = {}
    for char in s:
        count[char] = count.get(char, 0) + 1
    for i, char in enumerate(s):
        if count[char] == 1:
            return i
    return -1

print(first_unique_char("leetcode"))  # 0
```

**4️⃣9️⃣ Group anagrams**
```python
def group_anagrams(strs):
    anagrams = {}
    for s in strs:
        key = ''.join(sorted(s))
        if key not in anagrams:
            anagrams[key] = []
        anagrams[key].append(s)
    return list(anagrams.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
```

**5️⃣0️⃣ Find kth largest element**
```python
def kth_largest(nums, k):
    nums.sort(reverse=True)
    return nums[k-1]

print(kth_largest([3, 2, 1, 5, 6, 4], 2))  # 5
```

## **Advanced Level (51-80)**

**5️⃣1️⃣ Merge intervals**
```python
def merge_intervals(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for interval in intervals[1:]:
        if interval[0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], interval[1])
        else:
            merged.append(interval)
    return merged

print(merge_intervals([[1,3],[2,6],[8,10],[15,18]]))  # [[1,6],[8,10],[15,18]]
```

**5️⃣2️⃣ Longest palindromic substring**
```python
def longest_palindrome(s):
    def expand(left, right):
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        return s[left+1:right]
    
    result = ""
    for i in range(len(s)):
        odd = expand(i, i)
        even = expand(i, i+1)
        result = max(result, odd, even, key=len)
    return result

print(longest_palindrome("babad"))  # "bab"
```

**5️⃣3️⃣ Container with most water**
```python
def max_area(height):
    left, right = 0, len(height) - 1
    max_water = 0
    while left < right:
        width = right - left
        max_water = max(max_water, width * min(height[left], height[right]))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_water

print(max_area([1,8,6,2,5,4,8,3,7]))  # 49
```

**5️⃣4️⃣ Generate all permutations**
```python
def permute(nums):
    if len(nums) <= 1:
        return [nums]
    result = []
    for i in range(len(nums)):
        rest = nums[:i] + nums[i+1:]
        for p in permute(rest):
            result.append([nums[i]] + p)
    return result

print(permute([1, 2, 3]))  # [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

**5️⃣5️⃣ Generate all subsets**
```python
def subsets(nums):
    result = [[]]
    for num in nums:
        result += [curr + [num] for curr in result]
    return result

print(subsets([1, 2, 3]))  # [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```

**5️⃣6️⃣ Coin change problem**
```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] = min(dp[i], dp[i - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1

print(coin_change([1, 2, 5], 11))  # 3
```

**5️⃣7️⃣ Climbing stairs**
```python
def climb_stairs(n):
    if n <= 2:
        return n
    prev, curr = 1, 2
    for i in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr

print(climb_stairs(5))  # 8
```

**5️⃣8️⃣ Unique paths in grid**
```python
def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i-1][j] + dp[i][j-1]
    return dp[m-1][n-1]

print(unique_paths(3, 7))  # 28
```

**5️⃣9️⃣ Longest increasing subsequence**
```python
def length_of_lis(nums):
    if not nums:
        return 0
    dp = [1] * len(nums)
    for i in range(1, len(nums)):
        for j in range(i):
            if nums[i] > nums[j]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)

print(length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]))  # 4
```

**6️⃣0️⃣ Word break problem**
```python
def word_break(s, word_dict):
    dp = [False] * (len(s) + 1)
    dp[0] = True
    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in word_dict:
                dp[i] = True
                break
    return dp[len(s)]

print(word_break("leetcode", ["leet", "code"]))  # True
```

**6️⃣1️⃣ Reverse linked list (using list simulation)**
```python
def reverse_list(head):
    prev = None
    curr = 0
    while curr < len(head):
        next_idx = curr + 1
        head[curr], prev = prev, head[curr]
        curr = next_idx
    return head[::-1]

print(reverse_list([1, 2, 3, 4, 5]))  # [5, 4, 3, 2, 1]
```

**6️⃣2️⃣ Detect cycle in array**
```python
def has_cycle(arr):
    slow = fast = 0
    while True:
        slow = arr[slow]
        fast = arr[arr[fast]]
        if slow == fast:
            return True
        if fast >= len(arr) or arr[fast] >= len(arr):
            return False

# Example uses indices: [1, 2, 3, 4, 1] means 0->1->2->3->4->1 (cycle)
```

**6️⃣3️⃣ Find duplicate in array**
```python
def find_duplicate(nums):
    slow = fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow

print(find_duplicate([1, 3, 4, 2, 2]))  # 2
```

**6️⃣4️⃣ Spiral matrix traversal**
```python
def spiral_order(matrix):
    result = []
    while matrix:
        result += matrix.pop(0)
        if matrix and matrix[0]:
            for row in matrix:
                result.append(row.pop())
        if matrix:
            result += matrix.pop()[::-1]
        if matrix and matrix[0]:
            for row in matrix[::-1]:
                result.append(row.pop(0))
    return result

print(spiral_order([[1,2,3],[4,5,6],[7,8,9]]))  # [1,2,3,6,9,8,7,4,5]
```

**6️⃣5️⃣ Rotate matrix 90 degrees**
```python
def rotate_matrix(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
    return matrix

print(rotate_matrix([[1,2,3],[4,5,6],[7,8,9]]))
# [[7,4,1],[8,5,2],[9,6,3]]
```

**6️⃣6️⃣ Search in rotated sorted array**
```python
def search_rotated(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1

print(search_rotated([4,5,6,7,0,1,2], 0))  # 4
```

**6️⃣7️⃣ Trapping rain water**
```python
def trap(height):
    if not height:
        return 0
    left, right = 0, len(height) - 1
    left_max = right_max = water = 0
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
    return water

print(trap([0,1,0,2,1,0,1,3,2,1,2,1]))  # 6
```

**6️⃣8️⃣ Minimum window substring**
```python
def min_window(s, t):
    from collections import Counter
    need = Counter(t)
    missing = len(t)
    left = start = end = 0
    
    for right, char in enumerate(s):
        if need[char] > 0:
            missing -= 1
        need[char] -= 1
        
        if missing == 0:
            while left < right and need[s[left]] < 0:
                need[s[left]] += 1
                left += 1
            if end == 0 or right - left < end - start:
                start, end = left, right
    
    return s[start:end+1] if end != 0 else ""

print(min_window("ADOBECODEBANC", "ABC"))  # "BANC"
```

**6️⃣9️⃣ Serialize and deserialize binary tree**
```python
def serialize(root):
    if not root:
        return "null"
    return f"{root},{serialize(root.left)},{serialize(root.right)}"

def deserialize(data):
    def helper(nodes):
        val = next(nodes)
        if val == "null":
            return None
        node = val
        return node
    return helper(iter(data.split(',')))
```

**7️⃣0️⃣ LRU Cache implementation**
```python
class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.order = []
    
    def get(self, key):
        if key in self.cache:
            self.order.remove(key)
            self.order.append(key)
            return self.cache[key]
        return -1
    
    def put(self, key, value):
        if key in self.cache:
            self.order.remove(key)
        elif len(self.cache) >= self.capacity:
            oldest = self.order.pop(0)
            del self.cache[oldest]
        self.cache
        [key] = value
        self.order.append(key)
```

**7️⃣1️⃣ Decode ways**
```python
def num_decodings(s):
    if not s or s[0] == '0':
        return 0
    dp = [0] * (len(s) + 1)
    dp[0] = dp[1] = 1
    for i in range(2, len(s) + 1):
        if s[i-1] != '0':
            dp[i] += dp[i-1]
        two_digit = int(s[i-2:i])
        if 10 <= two_digit <= 26:
            dp[i] += dp[i-2]
    return dp[len(s)]

print(num_decodings("226"))  # 3
```

**7️⃣2️⃣ Edit distance**
```python
def min_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[m][n]

print(min_distance("horse", "ros"))  # 3
```

**7️⃣3️⃣ Regular expression matching**
```python
def is_match(s, p):
    dp = [[False] * (len(p) + 1) for _ in range(len(s) + 1)]
    dp[0][0] = True
    for j in range(2, len(p) + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-2]
    for i in range(1, len(s) + 1):
        for j in range(1, len(p) + 1):
            if p[j-1] == s[i-1] or p[j-1] == '.':
                dp[i][j] = dp[i-1][j-1]
            elif p[j-1] == '*':
                dp[i][j] = dp[i][j-2]
                if p[j-2] == s[i-1] or p[j-2] == '.':
                    dp[i][j] = dp[i][j] or dp[i-1][j]
    return dp[len(s)][len(p)]

print(is_match("aa", "a*"))  # True
```

**7️⃣4️⃣ Wildcard pattern matching**
```python
def is_match_wildcard(s, p):
    dp = [[False] * (len(p) + 1) for _ in range(len(s) + 1)]
    dp[0][0] = True
    for j in range(1, len(p) + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-1]
    for i in range(1, len(s) + 1):
        for j in range(1, len(p) + 1):
            if p[j-1] == s[i-1] or p[j-1] == '?':
                dp[i][j] = dp[i-1][j-1]
            elif p[j-1] == '*':
                dp[i][j] = dp[i-1][j] or dp[i][j-1]
    return dp[len(s)][len(p)]

print(is_match_wildcard("aa", "*"))  # True
```

**7️⃣5️⃣ N-Queens problem**
```python
def solve_n_queens(n):
    def is_safe(board, row, col):
        for i in range(row):
            if board[i] == col or abs(board[i] - col) == row - i:
                return False
        return True
    
    def backtrack(row):
        if row == n:
            result.append(['.' * board[i] + 'Q' + '.' * (n - board[i] - 1) for i in range(n)])
            return
        for col in range(n):
            if is_safe(board, row, col):
                board[row] = col
                backtrack(row + 1)
                board[row] = -1
    
    result = []
    board = [-1] * n
    backtrack(0)
    return result

print(len(solve_n_queens(4)))  # 2 solutions
```

**7️⃣6️⃣ Sudoku solver**
```python
def solve_sudoku(board):
    def is_valid(row, col, num):
        for i in range(9):
            if board[row][i] == num or board[i][col] == num:
                return False
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(3):
            for j in range(3):
                if board[start_row + i][start_col + j] == num:
                    return False
        return True
    
    def backtrack():
        for i in range(9):
            for j in range(9):
                if board[i][j] == '.':
                    for num in '123456789':
                        if is_valid(i, j, num):
                            board[i][j] = num
                            if backtrack():
                                return True
                            board[i][j] = '.'
                    return False
        return True
    
    backtrack()
    return board
```

**7️⃣7️⃣ Course schedule (topological sort)**
```python
def can_finish(num_courses, prerequisites):
    from collections import defaultdict, deque
    graph = defaultdict(list)
    in_degree = [0] * num_courses
    
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1
    
    queue = deque([i for i in range(num_courses) if in_degree[i] == 0])
    count = 0
    
    while queue:
        course = queue.popleft()
        count += 1
        for next_course in graph[course]:
            in_degree[next_course] -= 1
            if in_degree[next_course] == 0:
                queue.append(next_course)
    
    return count == num_courses

print(can_finish(2, [[1,0]]))  # True
```

**7️⃣8️⃣ Word ladder**
```python
def ladder_length(begin_word, end_word, word_list):
    from collections import deque
    word_set = set(word_list)
    if end_word not in word_set:
        return 0
    
    queue = deque([(begin_word, 1)])
    while queue:
        word, length = queue.popleft()
        if word == end_word:
            return length
        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                next_word = word[:i] + c + word[i+1:]
                if next_word in word_set:
                    word_set.remove(next_word)
                    queue.append((next_word, length + 1))
    return 0

print(ladder_length("hit", "cog", ["hot","dot","dog","lot","log","cog"]))  # 5
```

**7️⃣9️⃣ Implement Trie**
```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
    
    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True
    
    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end
    
    def starts_with(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True
```

**8️⃣0️⃣ Design hash map**
```python
class MyHashMap:
    def __init__(self):
        self.size = 1000
        self.buckets = [[] for _ in range(self.size)]
    
    def _hash(self, key):
        return key % self.size
    
    def put(self, key, value):
        bucket = self.buckets[self._hash(key)]
        for i, (k, v) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
    
    def get(self, key):
        bucket = self.buckets[self._hash(key)]
        for k, v in bucket:
            if k == key:
                return v
        return -1
    
    def remove(self, key):
        bucket = self.buckets[self._hash(key)]
        for i, (k, v) in enumerate(bucket):
            if k == key:
                del bucket[i]
                return
```

## **Expert Level (81-100)**

**8️⃣1️⃣ Median of two sorted arrays**
```python
def find_median_sorted_arrays(nums1, nums2):
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    left, right = 0, m
    
    while left <= right:
        i = (left + right) // 2
        j = (m + n + 1) // 2 - i
        
        max_left1 = float('-inf') if i == 0 else nums1[i-1]
        min_right1 = float('inf') if i == m else nums1[i]
        max_left2 = float('-inf') if j == 0 else nums2[j-1]
        min_right2 = float('inf') if j == n else nums2[j]
        
        if max_left1 <= min_right2 and max_left2 <= min_right1:
            if (m + n) % 2 == 0:
                return (max(max_left1, max_left2) + min(min_right1, min_right2)) / 2
            else:
                return max(max_left1, max_left2)
        elif max_left1 > min_right2:
            right = i - 1
        else:
            left = i + 1

print(find_median_sorted_arrays([1, 3], [2]))  # 2.0
```

**8️⃣2️⃣ Shortest path in binary matrix**
```python
def shortest_path_binary_matrix(grid):
    from collections import deque
    if grid[0][0] or grid[-1][-1]:
        return -1
    n = len(grid)
    queue = deque([(0, 0, 1)])
    grid[0][0] = 1
    directions = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
    
    while queue:
        x, y, dist = queue.popleft()
        if x == n - 1 and y == n - 1:
            return dist
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < n and 0 <= ny < n and grid[nx][ny] == 0:
                grid[nx][ny] = 1
                queue.append((nx, ny, dist + 1))
    return -1

print(shortest_path_binary_matrix([[0,1],[1,0]]))  # 2
```

**8️⃣3️⃣ Number of islands**
```python
def num_islands(grid):
    if not grid:
        return 0
    
    def dfs(i, j):
        if i < 0 or i >= len(grid) or j < 0 or j >= len(grid[0]) or grid[i][j] != '1':
            return
        grid[i][j] = '0'
        dfs(i+1, j)
        dfs(i-1, j)
        dfs(i, j+1)
        dfs(i, j-1)
    
    count = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == '1':
                dfs(i, j)
                count += 1
    return count

print(num_islands([['1','1','0'],['1','0','0'],['0','0','1']]))  # 2
```

**8️⃣4️⃣ Clone graph**
```python
def clone_graph(node):
    if not node:
        return None
    
    clones = {}
    def dfs(node):
        if node in clones:
            return clones[node]
        clone = type(node)(node.val)
        clones[node] = clone
        for neighbor in node.neighbors:
            clone.neighbors.append(dfs(neighbor))
        return clone
    
    return dfs(node)
```

**8️⃣5️⃣ Pacific Atlantic water flow**
```python
def pacific_atlantic(heights):
    if not heights:
        return []
    
    m, n = len(heights), len(heights[0])
    pacific = set()
    atlantic = set()
    
    def dfs(i, j, visited):
        visited.add((i, j))
        for di, dj in [(0,1),(1,0),(0,-1),(-1,0)]:
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n and (ni, nj) not in visited:
                if heights[ni][nj] >= heights[i][j]:
                    dfs(ni, nj, visited)
    
    for i in range(m):
        dfs(i, 0, pacific)
        dfs(i, n-1, atlantic)
    for j in range(n):
        dfs(0, j, pacific)
        dfs(m-1, j, atlantic)
    
    return list(pacific & atlantic)
```

**8️⃣6️⃣ Alien dictionary**
```python
def alien_order(words):
    from collections import defaultdict, deque
    graph = defaultdict(set)
    in_degree = {c: 0 for word in words for c in word}
    
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i+1]
        min_len = min(len(w1), len(w2))
        if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:
            return ""
        for j in range(min_len):
            if w1[j] != w2[j]:
                if w2[j] not in graph[w1[j]]:
                    graph[w1[j]].add(w2[j])
                    in_degree[w2[j]] += 1
                break
    
    queue = deque([c for c in in_degree if in_degree[c] == 0])
    result = []
    
    while queue:
        c = queue.popleft()
        result.append(c)
        for neighbor in graph[c]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    return ''.join(result) if len(result) == len(in_degree) else ""
```

**8️⃣7️⃣ Sliding window maximum**
```python
def max_sliding_window(nums, k):
    from collections import deque
    deq = deque()
    result = []
    
    for i, num in enumerate(nums):
        while deq and deq[0] < i - k + 1:
            deq.popleft()
        while deq and nums[deq[-1]] < num:
            deq.pop()
        deq.append(i)
        if i >= k - 1:
            result.append(nums[deq[0]])
    
    return result

print(max_sliding_window([1,3,-1,-3,5,3,6,7], 3))  # [3,3,5,5,6,7]
```

**8️⃣8️⃣ Minimum cost to hire K workers**
```python
def min_cost_to_hire_workers(quality, wage, k):
    import heapq
    workers = sorted([(w/q, q, w) for q, w in zip(quality, wage)])
    result = float('inf')
    quality_sum = 0
    heap = []
    
    for ratio, q, w in workers:
        heapq.heappush(heap, -q)
        quality_sum += q
        if len(heap) > k:
            quality_sum += heapq.heappop(heap)
        if len(heap) == k:
            result = min(result, quality_sum * ratio)
    
    return result
```

**8️⃣9️⃣ Maximum profit in job scheduling**
```python
def job_scheduling(start_time, end_time, profit):
    jobs = sorted(zip(start_time, end_time, profit), key=lambda x: x[1])
    dp = [[0, 0]]
    
    for s, e, p in jobs:
        i = bisect.bisect(dp, [s + 1]) - 1
        if dp[i][1] + p > dp[-1][1]:
            dp.append([e, dp[i][1] + p])
    
    return dp[-1][1]
```

**9️⃣0️⃣ Russian doll envelopes**
```python
def max_envelopes(envelopes):
    envelopes.sort(key=lambda x: (x[0], -x[1]))
    heights = [h for w, h in envelopes]
    
    from bisect import bisect_left
    dp = []
    for h in heights:
        idx = bisect_left(dp, h)
        if idx == len(dp):
            dp.append(h)
        else:
            dp[idx] = h
    
    return len(dp)
```

**9️⃣1️⃣ Burst balloons**
```python
def max_coins(nums):
    nums = [1] + nums + [1]
    n = len(nums)
    dp = [[0] * n for _ in range(n)]
    
    for length in range(2, n):
        for left in range(n - length):
            right = left + length
            for i in range(left + 1, right):
                dp[left][right] = max(dp[left][right],
                    nums[left] * nums[i] * nums[right] + dp[left][i] + dp[i][right])
    
    return dp[0][n-1]

print(max_coins([3,1,5,8]))  # 167
```

**9️⃣2️⃣ Remove invalid parentheses**
```python
def remove_invalid_parentheses(s):
    def is_valid(s):
        count = 0
        for c in s:
            if c == '(':
                count += 1
            elif c == ')':
                count -= 1
                if count < 0:
                    return False
        return count == 0
    
    level = {s}
    while True:
        valid = [x for x in level if is_valid(x)]
        if valid:
            return valid
        level = {s[:i] + s[i+1:] for s in level for i in range(len(s))}

print(remove_invalid_parentheses("()())()"))  # ["(())()","()()()"]
```

**9️⃣3️⃣ Longest valid parentheses**
```python
def longest_valid_parentheses(s):
    stack = [-1]
    max_len = 0
    
    for i, char in enumerate(s):
        if char == '(':
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)
            else:
                max_len = max(max_len, i - stack[-1])
    
    return max_len

print(longest_valid_parentheses("(()"))  # 2
```

**9️⃣4️⃣ Largest rectangle in histogram**
```python
def largest_rectangle_area(heights):
    stack = []
    max_area = 0
    heights.append(0)
    
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    
    return max_area

print(largest_rectangle_area([2,1,5,6,2,3]))  # 10
```

**9️⃣5️⃣ Maximal rectangle**
```python
def maximal_rectangle(matrix):
    if not matrix:
        return 0
    
    max_area = 0
    heights = [0] * len(matrix[0])
    
    for row in matrix:
        for i in range(len(row)):
            heights[i] = heights[i] + 1 if row[i] == '1' else 0
        max_area = max(max_area, largest_rectangle_area(heights.copy()))
    
    return max_area
```

**9️⃣6️⃣ Count of smaller numbers after self**
```python
def count_smaller(nums):
    def merge_sort(arr):
        if len(arr) <= 1:
            return arr
        mid = len(arr) // 2
        left = merge_sort(arr[:mid])
        right = merge_sort(arr[mid:])
        
        i = j = 0
        merged = []
        while i < len(left) and j < len(right):
            if left[i][1] <= right[j][1]:
                result[left[i][0]] += j
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                j += 1
        
        while i < len(left):
            result[left[i][0]] += j
            merged.append(left[i])
            i += 1
        merged.extend(right[j:])
        return merged
    
    result = [0] * len(nums)
    merge_sort(list(enumerate(nums)))
    return result

print(count_smaller([5,2,6,1]))  # [2,1,1,0]
```

**9️⃣7️⃣ Split array largest sum**
```python
def split_array(nums, m):
    def can_split(max_sum):
        count = 1
        current_sum = 0
        for num in nums:
            if current_sum + num > max_sum:
                count += 1
                current_sum = num
            else:
                current_sum += num
        return count <= m
    
    left, right = max(nums), sum(nums)
    while left < right:
        mid = (left + right) // 2
        if can_split(mid):
            right = mid
        else:
            left = mid + 1
    
    return left

print(split_array([7,2,5,10,8], 2))  # 18
```

**9️⃣8️⃣ Binary tree maximum path sum**
```python
def max_path_sum(root):
    max_sum = float('-inf')
    
    def dfs(node):
        nonlocal max_sum
        if not node:
            return 0
        
        left = max(0, dfs(node.left))
        right = max(0, dfs(node.right))
        
        max_sum = max(max_sum, node.val + left + right)
        return node.val + max(left, right)
    
    dfs(root)
    return max_sum
```

**9️⃣9️⃣ Scramble string**
```python
def is_scramble(s1, s2):
    if s1 == s2:
        return True
    if sorted(s1) != sorted(s2):
        return False
    
    n = len(s1)
    for i in range(1, n):
        if (is_scramble(s1[:i], s2[:i]) and is_scramble(s1[i:], s2[i:])) or \
           (is_scramble(s1[:i], s2[n-i:]) and is_scramble(s1[i:], s2[:n-i])):
            return True
    
    return False

print(is_scramble("great", "rgeat"))  # True
```

**🔟0️⃣ Palindrome partitioning II (min cuts)**
```python
def min_cut(s):
    n = len(s)
    is_palindrome = [[False] * n for _ in range(n)]
    
    for i in range(n):
        is_palindrome[i][i] = True
    for i in range(n - 1):
        is_palindrome[i][i + 1] = (s[i] == s[i + 1])
    
    for length in range(3, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            is_palindrome[i][j] = (s[i] == s[j] and is_palindrome[i + 1][j - 1])
    
    dp = [float('inf')] * n
    for i in range(n):
        if is_palindrome[0][i]:
            dp[i] = 0
        else:
            for j in range(i):
                if is_palindrome[j + 1][i]:
                    dp[i] = min(dp[i], dp[j] + 1)
    
    return dp[n - 1]

print(min_cut("aab"))  # 1
```

---

These 100 Python questions cover fundamental programming concepts, data structures, algorithms, dynamic programming, graph theory, and advanced problem-solving techniques. Practice these regularly to strengthen your coding skills! 🚀