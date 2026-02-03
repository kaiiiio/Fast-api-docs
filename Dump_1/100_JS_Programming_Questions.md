# 🟨 100 JavaScript Programming Questions with Answers

## **Basic Level (1-20)**

**1️⃣ Check if a number is prime**
```javascript
function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
    }
    return true;
}
console.log(isPrime(17)); // true
```

**2️⃣ Reverse a number**
```javascript
function reverseNumber(n) {
    const reversed = parseInt(Math.abs(n).toString().split('').reverse().join(''));
    return reversed * Math.sign(n);
}
console.log(reverseNumber(12345)); // 54321
```

**3️⃣ Count vowels in a string**
```javascript
function countVowels(s) {
    const vowels = 'aeiou';
    return s.toLowerCase().split('').filter(char => vowels.includes(char)).length;
}
console.log(countVowels("Hello World")); // 3
```

**4️⃣ Find maximum subarray sum (Kadane's Algorithm)**
```javascript
function maxSubarraySum(arr) {
    let maxSum = arr[0], currentSum = arr[0];
    for (let i = 1; i < arr.length; i++) {
        currentSum = Math.max(arr[i], currentSum + arr[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}
console.log(maxSubarraySum([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6
```

**5️⃣ Remove duplicates from list**
```javascript
function removeDuplicates(lst) {
    return [...new Set(lst)];
}
console.log(removeDuplicates([1, 2, 2, 3, 4, 4, 5])); // [1, 2, 3, 4, 5]
```

**6️⃣ Check if string is palindrome**
```javascript
function isPalindrome(s) {
    const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleaned === cleaned.split('').reverse().join('');
}
console.log(isPalindrome("A man a plan a canal Panama")); // true
```

**7️⃣ Find factorial of a number**
```javascript
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
console.log(factorial(5)); // 120
```

**8️⃣ Generate Fibonacci sequence**
```javascript
function fibonacci(n) {
    const fib = [0, 1];
    for (let i = 2; i < n; i++) {
        fib.push(fib[i - 1] + fib[i - 2]);
    }
    return fib.slice(0, n);
}
console.log(fibonacci(10)); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

**9️⃣ Find GCD of two numbers**
```javascript
function gcd(a, b) {
    while (b) {
        [a, b] = [b, a % b];
    }
    return a;
}
console.log(gcd(48, 18)); // 6
```

**🔟 Find LCM of two numbers**
```javascript
function lcm(a, b) {
    return Math.abs(a * b) / gcd(a, b);
}
console.log(lcm(12, 15)); // 60
```

**1️⃣1️⃣ Check if number is Armstrong**
```javascript
function isArmstrong(n) {
    const digits = n.toString().split('');
    const power = digits.length;
    const sum = digits.reduce((acc, d) => acc + Math.pow(parseInt(d), power), 0);
    return n === sum;
}
console.log(isArmstrong(153)); // true
```

**1️⃣2️⃣ Sum of digits**
```javascript
function sumOfDigits(n) {
    return Math.abs(n).toString().split('').reduce((acc, d) => acc + parseInt(d), 0);
}
console.log(sumOfDigits(12345)); // 15
```

**1️⃣3️⃣ Check if number is perfect square**
```javascript
function isPerfectSquare(n) {
    return Math.pow(Math.floor(Math.sqrt(n)), 2) === n;
}
console.log(isPerfectSquare(16)); // true
```

**1️⃣4️⃣ Convert binary to decimal**
```javascript
function binaryToDecimal(binary) {
    return parseInt(binary, 2);
}
console.log(binaryToDecimal('1010')); // 10
```

**1️⃣5️⃣ Convert decimal to binary**
```javascript
function decimalToBinary(n) {
    return n.toString(2);
}
console.log(decimalToBinary(10)); // '1010'
```

**1️⃣6️⃣ Find second largest in list**
```javascript
function secondLargest(lst) {
    const unique = [...new Set(lst)].sort((a, b) => a - b);
    return unique.length >= 2 ? unique[unique.length - 2] : null;
}
console.log(secondLargest([10, 20, 4, 45, 99])); // 45
```

**1️⃣7️⃣ Count frequency of elements**
```javascript
function countFrequency(lst) {
    const freq = {};
    lst.forEach(item => {
        freq[item] = (freq[item] || 0) + 1;
    });
    return freq;
}
console.log(countFrequency([1, 2, 2, 3, 3, 3])); // {1: 1, 2: 2, 3: 3}
```

**1️⃣8️⃣ Swap two variables without temp**
```javascript
function swap(a, b) {
    [a, b] = [b, a];
    return [a, b];
}
console.log(swap(5, 10)); // [10, 5]
```

**1️⃣9️⃣ Check if string is anagram**
```javascript
function isAnagram(s1, s2) {
    const normalize = s => s.toLowerCase().split('').sort().join('');
    return normalize(s1) === normalize(s2);
}
console.log(isAnagram("listen", "silent")); // true
```

**2️⃣0️⃣ Find missing number in array**
```javascript
function findMissing(arr, n) {
    const total = (n * (n + 1)) / 2;
    const sum = arr.reduce((acc, num) => acc + num, 0);
    return total - sum;
}
console.log(findMissing([1, 2, 4, 5, 6], 6)); // 3
```

## **Intermediate Level (21-50)**

**2️⃣1️⃣ Merge two sorted arrays**
```javascript
function mergeSorted(arr1, arr2) {
    const result = [];
    let i = 0, j = 0;
    while (i < arr1.length && j < arr2.length) {
        if (arr1[i] < arr2[j]) {
            result.push(arr1[i++]);
        } else {
            result.push(arr2[j++]);
        }
    }
    return [...result, ...arr1.slice(i), ...arr2.slice(j)];
}
console.log(mergeSorted([1, 3, 5], [2, 4, 6])); // [1, 2, 3, 4, 5, 6]
```

**2️⃣2️⃣ Binary search**
```javascript
function binarySearch(arr, target) {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}
console.log(binarySearch([1, 2, 3, 4, 5], 3)); // 2
```

**2️⃣3️⃣ Bubble sort**
```javascript
function bubbleSort(arr) {
    let n = arr.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}
console.log(bubbleSort([64, 34, 25, 12, 22])); // [12, 22, 25, 34, 64]
```

**2️⃣4️⃣ Selection sort**
```javascript
function selectionSort(arr) {
    let n = arr.length;
    for (let i = 0; i < n; i++) {
        let minIdx = i;
        for (let j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
    return arr;
}
console.log(selectionSort([64, 25, 12, 22, 11])); // [11, 12, 22, 25, 64]
```

**2️⃣5️⃣ Insertion sort**
```javascript
function insertionSort(arr) {
    for (let i = 1; i < arr.length; i++) {
        let key = arr[i];
        let j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    return arr;
}
console.log(insertionSort([12, 11, 13, 5, 6])); // [5, 6, 11, 12, 13]
```

**2️⃣6️⃣ Find longest substring without repeating characters**
```javascript
function longestSubstring(s) {
    let charSet = new Set();
    let left = 0, maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        while (charSet.has(s[right])) {
            charSet.delete(s[left++]);
        }
        charSet.add(s[right]);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
console.log(longestSubstring("abcabcbb")); // 3
```

**2️⃣7️⃣ Two sum problem**
```javascript
function twoSum(nums, target) {
    let seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        let complement = target - nums[i];
        if (seen.has(complement)) return [seen.get(complement), i];
        seen.set(nums[i], i);
    }
    return [];
}
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
```

**2️⃣8️⃣ Valid parentheses**
```javascript
function isValidParentheses(s) {
    const stack = [];
    const mapping = { ')': '(', '}': '{', ']': '[' };
    for (let char of s) {
        if (mapping[char]) {
            if (stack.pop() !== mapping[char]) return false;
        } else {
            stack.push(char);
        }
    }
    return stack.length === 0;
}
console.log(isValidParentheses("()[]{}")); // true
```

**2️⃣9️⃣ Rotate array**
```javascript
function rotateArray(arr, k) {
    k = k % arr.length;
    return [...arr.slice(-k), ...arr.slice(0, -k)];
}
console.log(rotateArray([1, 2, 3, 4, 5], 2)); // [4, 5, 1, 2, 3]
```

**3️⃣0️⃣ Find intersection of two arrays**
```javascript
function intersection(arr1, arr2) {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    return [...set1].filter(x => set2.has(x));
}
console.log(intersection([1, 2, 2, 1], [2, 2])); // [2]
```

**3️⃣1️⃣ Find union of two arrays**
```javascript
function union(arr1, arr2) {
    return [...new Set([...arr1, ...arr2])];
}
console.log(union([1, 2, 3], [2, 3, 4])); // [1, 2, 3, 4]
```

**3️⃣2️⃣ Move zeros to end**
```javascript
function moveZeros(arr) {
    const nonZero = arr.filter(x => x !== 0);
    const zeros = Array(arr.length - nonZero.length).fill(0);
    return [...nonZero, ...zeros];
}
console.log(moveZeros([0, 1, 0, 3, 12])); // [1, 3, 12, 0, 0]
```

**3️⃣3️⃣ Find all pairs with given sum**
```javascript
function findPairs(arr, target) {
    const pairs = [];
    const seen = new Set();
    for (let num of arr) {
        let complement = target - num;
        if (seen.has(complement)) pairs.push([complement, num]);
        seen.add(num);
    }
    return pairs;
}
console.log(findPairs([1, 5, 7, -1, 5], 6)); // [[1, 5], [7, -1], [1, 5]]
```

**3️⃣4️⃣ Check if array is sorted**
```javascript
function isSorted(arr) {
    return arr.every((val, i) => i === 0 || arr[i - 1] <= val);
}
console.log(isSorted([1, 2, 3, 4, 5])); // true
```

**3️⃣5️⃣ Reverse words in string**
```javascript
function reverseWords(s) {
    return s.split(' ').reverse().join(' ');
}
console.log(reverseWords("Hello World Python")); // "Python World Hello"
```

**3️⃣6️⃣ Count characters in string**
```javascript
function countChars(s) {
    const freq = {};
    for (let char of s) {
        freq[char] = (freq[char] || 0) + 1;
    }
    return freq;
}
console.log(countChars("hello")); // {h: 1, e: 1, l: 2, o: 1}
```

**3️⃣7️⃣ Remove vowels from string**
```javascript
function removeVowels(s) {
    return s.replace(/[aeiou]/gi, '');
}
console.log(removeVowels("Hello World")); // "Hll Wrld"
```

**3️⃣8️⃣ Check if power of two**
```javascript
function isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
}
console.log(isPowerOfTwo(16)); // true
```

**3️⃣9️⃣ Find single number (all others appear twice)**
```javascript
function singleNumber(nums) {
    return nums.reduce((acc, num) => acc ^ num, 0);
}
console.log(singleNumber([4, 1, 2, 1, 2])); // 4
```

**4️⃣0️⃣ Flatten nested list**
```javascript
function flatten(nestedList) {
    return nestedList.reduce((acc, item) =>
        acc.concat(Array.isArray(item) ? flatten(item) : item), []);
}
console.log(flatten([1, [2, 3], [[4], 5]])); // [1, 2, 3, 4, 5]
```

**4️⃣1️⃣ Find majority element**
```javascript
function majorityElement(nums) {
    let count = 0, candidate = null;
    for (let num of nums) {
        if (count === 0) candidate = num;
        count += (num === candidate) ? 1 : -1;
    }
    return candidate;
}
console.log(majorityElement([3, 2, 3])); // 3
```

**4️⃣2️⃣ Longest common prefix**
```javascript
function longestCommonPrefix(strs) {
    if (!strs.length) return "";
    let prefix = strs[0];
    for (let i = 1; i < strs.length; i++) {
        while (strs[i].indexOf(prefix) !== 0) {
            prefix = prefix.slice(0, -1);
            if (!prefix) return "";
        }
    }
    return prefix;
}
console.log(longestCommonPrefix(["flower", "flow", "flight"])); // "fl"
```

**4️⃣3️⃣ Check if subsequence**
```javascript
function isSubsequence(s, t) {
    let i = 0;
    for (let char of t) {
        if (i < s.length && s[i] === char) i++;
    }
    return i === s.length;
}
console.log(isSubsequence("abc", "ahbgdc")); // true
```

**4️⃣4️⃣ Remove adjacent duplicates**
```javascript
function removeAdjacentDuplicates(s) {
    const stack = [];
    for (let char of s) {
        if (stack.length && stack[stack.length - 1] === char) {
            stack.pop();
        } else {
            stack.push(char);
        }
    }
    return stack.join('');
}
console.log(removeAdjacentDuplicates("abbaca")); // "ca"
```

**4️⃣5️⃣ Count primes up to n**
```javascript
function countPrimes(n) {
    if (n <= 2) return 0;
    const isPrime = Array(n).fill(true);
    isPrime[0] = isPrime[1] = false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (isPrime[i]) {
            for (let j = i * i; j < n; j += i) isPrime[j] = false;
        }
    }
    return isPrime.filter(Boolean).length;
}
console.log(countPrimes(10)); // 4
```

**4️⃣6️⃣ Find peak element**
```javascript
function findPeak(arr) {
    let left = 0, right = arr.length - 1;
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (arr[mid] < arr[mid + 1]) left = mid + 1;
        else right = mid;
    }
    return left;
}
console.log(findPeak([1, 2, 3, 1])); // 2
```

**4️⃣7️⃣ Product of array except self**
```javascript
function productExceptSelf(nums) {
    const n = nums.length;
    const result = Array(n).fill(1);
    let left = 1;
    for (let i = 0; i < n; i++) {
        result[i] = left;
        left *= nums[i];
    }
    let right = 1;
    for (let i = n - 1; i >= 0; i--) {
        result[i] *= right;
        right *= nums[i];
    }
    return result;
}
console.log(productExceptSelf([1, 2, 3, 4])); // [24, 12, 8, 6]
```

**4️⃣8️⃣ Find first unique character**
```javascript
function firstUniqueChar(s) {
    const count = {};
    for (let char of s) count[char] = (count[char] || 0) + 1;
    for (let i = 0; i < s.length; i++) {
        if (count[s[i]] === 1) return i;
    }
    return -1;
}
console.log(firstUniqueChar("leetcode")); // 0
```

**4️⃣9️⃣ Group anagrams**
```javascript
function groupAnagrams(strs) {
    const map = new Map();
    for (let s of strs) {
        const sorted = s.split('').sort().join('');
        if (!map.has(sorted)) map.set(sorted, []);
        map.get(sorted).push(s);
    }
    return Array.from(map.values());
}
console.log(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]));
// [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
```

**5️⃣0️⃣ Find kth largest element**
```javascript
function kthLargest(nums, k) {
    return nums.sort((a, b) => b - a)[k - 1];
}
console.log(kthLargest([3, 2, 1, 5, 6, 4], 2)); // 5
```

## **Advanced Level (51-80)**

**51. Merge intervals**
```javascript
function mergeIntervals(intervals) {
    if (!intervals.length) return [];
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        if (intervals[i][0] <= last[1]) {
            last[1] = Math.max(last[1], intervals[i][1]);
        } else {
            merged.push(intervals[i]);
        }
    }
    return merged;
}
console.log(mergeIntervals([[1,3],[2,6],[8,10],[15,18]])); // [[1,6],[8,10],[15,18]]
```

**52. Longest palindromic substring**
```javascript
function longestPalindrome(s) {
    if (s.length < 2) return s;
    let start = 0, maxLength = 1;
    function expand(left, right) {
        while (left >= 0 && right < s.length && s[left] === s[right]) {
            if (right - left + 1 > maxLength) {
                start = left;
                maxLength = right - left + 1;
            }
            left--;
            right++;
        }
    }
    for (let i = 0; i < s.length; i++) {
        expand(i, i);
        expand(i, i + 1);
    }
    return s.substring(start, start + maxLength);
}
console.log(longestPalindrome("babad")); // "bab"
```

**53. Container with most water**
```javascript
function maxArea(height) {
    let left = 0, right = height.length - 1;
    let maxWater = 0;
    while (left < right) {
        let width = right - left;
        maxWater = Math.max(maxWater, width * Math.min(height[left], height[right]));
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxWater;
}
console.log(maxArea([1,8,6,2,5,4,8,3,7])); // 49
```

**54. Generate all permutations**
```javascript
function permute(nums) {
    const result = [];
    function backtrack(curr, remaining) {
        if (remaining.length === 0) {
            result.push(curr);
            return;
        }
        for (let i = 0; i < remaining.length; i++) {
            backtrack([...curr, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
        }
    }
    backtrack([], nums);
    return result;
}
console.log(permute([1, 2, 3])); // [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

**55. Generate all subsets**
```javascript
function subsets(nums) {
    const result = [[]];
    for (let num of nums) {
        const size = result.length;
        for (let i = 0; i < size; i++) {
            result.push([...result[i], num]);
        }
    }
    return result;
}
console.log(subsets([1, 2, 3])); // [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```

**56. Coin change problem**
```javascript
function coinChange(coins, amount) {
    const dp = Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let coin of coins) {
        for (let i = coin; i <= amount; i++) {
            dp[i] = Math.min(dp[i], dp[i - coin] + 1);
        }
    }
    return dp[amount] === Infinity ? -1 : dp[amount];
}
console.log(coinChange([1, 2, 5], 11)); // 3
```

**57. Climbing stairs**
```javascript
function climbStairs(n) {
    if (n <= 2) return n;
    let first = 1, second = 2;
    for (let i = 3; i <= n; i++) {
        let third = first + second;
        first = second;
        second = third;
    }
    return second;
}
console.log(climbStairs(5)); // 8
```

**58. Unique paths in grid**
```javascript
function uniquePaths(m, n) {
    const dp = Array.from({ length: m }, () => Array(n).fill(1));
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    return dp[m - 1][n - 1];
}
console.log(uniquePaths(3, 7)); // 28
```

**59. Longest increasing subsequence**
```javascript
function lengthOfLIS(nums) {
    if (!nums.length) return 0;
    const dp = Array(nums.length).fill(1);
    for (let i = 1; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[i] > nums[j]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
    }
    return Math.max(...dp);
}
console.log(lengthOfLIS([10, 9, 2, 5, 3, 7, 101, 18])); // 4
```

**60. Word break problem**
```javascript
function wordBreak(s, wordDict) {
    const wordSet = new Set(wordDict);
    const dp = Array(s.length + 1).fill(false);
    dp[0] = true;
    for (let i = 1; i <= s.length; i++) {
        for (let j = 0; j < i; j++) {
            if (dp[j] && wordSet.has(s.substring(j, i))) {
                dp[i] = true;
                break;
            }
        }
    }
    return dp[s.length];
}
console.log(wordBreak("leetcode", ["leet", "code"])); // true
```

**61. Reverse linked list (using array simulation)**
```javascript
function reverseList(head) {
    return head.reverse();
}
console.log(reverseList([1, 2, 3, 4, 5])); // [5, 4, 3, 2, 1]
```

**62. Detect cycle in array (index-based)**
```javascript
function hasCycle(arr) {
    let slow = 0, fast = 0;
    while (true) {
        slow = arr[slow];
        if (arr[fast] === undefined || arr[arr[fast]] === undefined) return false;
        fast = arr[arr[fast]];
        if (slow === fast) return true;
        if (slow >= arr.length || fast >= arr.length) return false;
    }
}
```

**63. Find duplicate in array (Floyd's Cycle-Finding Algorithm)**
```javascript
function findDuplicate(nums) {
    let slow = nums[0], fast = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
console.log(findDuplicate([1, 3, 4, 2, 2])); // 2
```

**64. Spiral matrix traversal**
```javascript
function spiralOrder(matrix) {
    const result = [];
    if (!matrix.length) return result;
    let top = 0, bottom = matrix.length - 1;
    let left = 0, right = matrix[0].length - 1;
    while (top <= bottom && left <= right) {
        for (let i = left; i <= right; i++) result.push(matrix[top][i]);
        top++;
        for (let i = top; i <= bottom; i++) result.push(matrix[i][right]);
        right--;
        if (top <= bottom) {
            for (let i = right; i >= left; i--) result.push(matrix[bottom][i]);
            bottom--;
        }
        if (left <= right) {
            for (let i = bottom; i >= top; i--) result.push(matrix[i][left]);
            left++;
        }
    }
    return result;
}
console.log(spiralOrder([[1,2,3],[4,5,6],[7,8,9]])); // [1,2,3,6,9,8,7,4,5]
```

**65. Rotate matrix 90 degrees**
```javascript
function rotateMatrix(matrix) {
    const n = matrix.length;
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
        }
    }
    return matrix.map(row => row.reverse());
}
console.log(rotateMatrix([[1,2,3],[4,5,6],[7,8,9]])); // [[7,4,1],[8,5,2],[9,6,3]]
```

**66. Search in rotated sorted array**
```javascript
function searchRotated(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
}
console.log(searchRotated([4,5,6,7,0,1,2], 0)); // 4
```

**67. Trapping rain water**
```javascript
function trap(height) {
    let left = 0, right = height.length - 1;
    let leftMax = 0, rightMax = 0, water = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) leftMax = height[left];
            else water += leftMax - height[left];
            left++;
        } else {
            if (height[right] >= rightMax) rightMax = height[right];
            else water += rightMax - height[right];
            right--;
        }
    }
    return water;
}
console.log(trap([0,1,0,2,1,0,1,3,2,1,2,1])); // 6
```

**68. Minimum window substring**
```javascript
function minWindow(s, t) {
    const map = new Map();
    for (let char of t) map.set(char, (map.get(char) || 0) + 1);
    let left = 0, right = 0, count = map.size;
    let start = 0, minLen = Infinity;
    while (right < s.length) {
        let c = s[right];
        if (map.has(c)) {
            map.set(c, map.get(c) - 1);
            if (map.get(c) === 0) count--;
        }
        right++;
        while (count === 0) {
            if (right - left < minLen) {
                minLen = right - left;
                start = left;
            }
            let d = s[left];
            if (map.has(d)) {
                map.set(d, map.get(d) + 1);
                if (map.get(d) > 0) count++;
            }
            left++;
        }
    }
    return minLen === Infinity ? "" : s.substring(start, start + minLen);
}
console.log(minWindow("ADOBECODEBANC", "ABC")); // "BANC"
```

**69. Serialize and deserialize binary tree (Simple array simulation)**
```javascript
function serialize(root) {
    return JSON.stringify(root);
}
function deserialize(data) {
    return JSON.parse(data);
}
```

**70. LRU Cache implementation**
```javascript
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }
    get(key) {
        if (!this.cache.has(key)) return -1;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    put(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        this.cache.set(key, value);
        if (this.cache.size > this.capacity) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
}
```

**71. Decode ways**
```javascript
function numDecodings(s) {
    if (!s || s[0] === '0') return 0;
    const dp = Array(s.length + 1).fill(0);
    dp[0] = 1;
    dp[1] = 1;
    for (let i = 2; i <= s.length; i++) {
        const oneDigit = parseInt(s[i - 1]);
        const twoDigits = parseInt(s.substring(i - 2, i));
        if (oneDigit >= 1) dp[i] += dp[i - 1];
        if (twoDigits >= 10 && twoDigits <= 26) dp[i] += dp[i - 2];
    }
    return dp[s.length];
}
console.log(numDecodings("226")); // 3
```

**72. Edit distance**
```javascript
function minDistance(word1, word2) {
    const m = word1.length, n = word2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (word1[i - 1] === word2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}
console.log(minDistance("horse", "ros")); // 3
```

**73. Regular expression matching**
```javascript
function isMatch(s, p) {
    const m = s.length, n = p.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let j = 2; j <= n; j++) {
        if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
    }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (p[j - 1] === s[i - 1] || p[j - 1] === '.') dp[i][j] = dp[i - 1][j - 1];
            else if (p[j - 1] === '*') {
                dp[i][j] = dp[i][j - 2];
                if (p[j - 2] === s[i - 1] || p[j - 2] === '.') dp[i][j] = dp[i][j] || dp[i - 1][j];
            }
        }
    }
    return dp[m][n];
}
console.log(isMatch("aa", "a*")); // true
```

**74. Wildcard pattern matching**
```javascript
function isMatchWildcard(s, p) {
    const m = s.length, n = p.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let j = 1; j <= n; j++) {
        if (p[j - 1] === '*') dp[0][j] = dp[0][j - 1];
    }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (p[j - 1] === s[i - 1] || p[j - 1] === '?') dp[i][j] = dp[i - 1][j - 1];
            else if (p[j - 1] === '*') dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
        }
    }
    return dp[m][n];
}
console.log(isMatchWildcard("aa", "*")); // true
```

**75. N-Queens problem**
```javascript
function solveNQueens(n) {
    const result = [];
    const board = Array.from({ length: n }, () => Array(n).fill('.'));
    function isSafe(row, col) {
        for (let i = 0; i < row; i++) {
            if (board[i][col] === 'Q') return false;
            let diff = row - i;
            if (col - diff >= 0 && board[i][col - diff] === 'Q') return false;
            if (col + diff < n && board[i][col + diff] === 'Q') return false;
        }
        return true;
    }
    function backtrack(row) {
        if (row === n) {
            result.push(board.map(r => r.join('')));
            return;
        }
        for (let col = 0; col < n; col++) {
            if (isSafe(row, col)) {
                board[row][col] = 'Q';
                backtrack(row + 1);
                board[row][col] = '.';
            }
        }
    }
    backtrack(0);
    return result;
}
console.log(solveNQueens(4).length); // 2
```

**76. Sudoku solver**
```javascript
function solveSudoku(board) {
    function isValid(row, col, num) {
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num || board[i][col] === num) return false;
            let r = 3 * Math.floor(row / 3) + Math.floor(i / 3);
            let c = 3 * Math.floor(col / 3) + (i % 3);
            if (board[r][c] === num) return false;
        }
        return true;
    }
    function backtrack() {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === '.') {
                    for (let num = 1; num <= 9; num++) {
                        let n = num.toString();
                        if (isValid(i, j, n)) {
                            board[i][j] = n;
                            if (backtrack()) return true;
                            board[i][j] = '.';
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    backtrack();
    return board;
}
```

**77. Course schedule (topological sort)**
```javascript
function canFinish(numCourses, prerequisites) {
    const adj = Array.from({ length: numCourses }, () => []);
    const inDegree = Array(numCourses).fill(0);
    for (let [u, v] of prerequisites) {
        adj[v].push(u);
        inDegree[u]++;
    }
    const queue = [];
    for (let i = 0; i < numCourses; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }
    let count = 0;
    while (queue.length) {
        let u = queue.shift();
        count++;
        for (let v of adj[u]) {
            inDegree[v]--;
            if (inDegree[v] === 0) queue.push(v);
        }
    }
    return count === numCourses;
}
console.log(canFinish(2, [[1, 0]])); // true
```

**78. Word ladder**
```javascript
function ladderLength(beginWord, endWord, wordList) {
    const wordSet = new Set(wordList);
    if (!wordSet.has(endWord)) return 0;
    const queue = [[beginWord, 1]];
    while (queue.length) {
        let [word, length] = queue.shift();
        if (word === endWord) return length;
        for (let i = 0; i < word.length; i++) {
            for (let j = 0; j < 26; j++) {
                let nextWord = word.substring(0, i) + String.fromCharCode(97 + j) + word.substring(i + 1);
                if (wordSet.has(nextWord)) {
                    wordSet.delete(nextWord);
                    queue.push([nextWord, length + 1]);
                }
            }
        }
    }
    return 0;
}
console.log(ladderLength("hit", "cog", ["hot","dot","dog","lot","log","cog"])); // 5
```

**79. Implement Trie**
```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}
class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    insert(word) {
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEnd = true;
    }
    search(word) {
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) return false;
            node = node.children[char];
        }
        return node.isEnd;
    }
    startsWith(prefix) {
        let node = this.root;
        for (let char of prefix) {
            if (!node.children[char]) return false;
            node = node.children[char];
        }
        return true;
    }
}
```

**80. Design hash map**
```javascript
class MyHashMap {
    constructor() {
        this.size = 1000;
        this.buckets = Array.from({ length: this.size }, () => []);
    }
    _hash(key) { return key % this.size; }
    put(key, value) {
        const bucket = this.buckets[this._hash(key)];
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket[i][1] = value;
                return;
            }
        }
        bucket.push([key, value]);
    }
    get(key) {
        const bucket = this.buckets[this._hash(key)];
        for (let item of bucket) {
            if (item[0] === key) return item[1];
        }
        return -1;
    }
    remove(key) {
        const bucket = this.buckets[this._hash(key)];
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket.splice(i, 1);
                return;
            }
        }
    }
}
```

## **Expert Level (81-100)**

**81. Median of two sorted arrays**
```javascript
function findMedianSortedArrays(nums1, nums2) {
    if (nums1.length > nums2.length) [nums1, nums2] = [nums2, nums1];
    let m = nums1.length, n = nums2.length;
    let left = 0, right = m, halfLen = Math.floor((m + n + 1) / 2);
    while (left <= right) {
        let i = Math.floor((left + right) / 2);
        let j = halfLen - i;
        if (i < m && nums2[j - 1] > nums1[i]) left = i + 1;
        else if (i > 0 && nums1[i - 1] > nums2[j]) right = i - 1;
        else {
            let maxLeft = 0;
            if (i === 0) maxLeft = nums2[j - 1];
            else if (j === 0) maxLeft = nums1[i - 1];
            else maxLeft = Math.max(nums1[i - 1], nums2[j - 1]);
            if ((m + n) % 2 === 1) return maxLeft;
            let minRight = 0;
            if (i === m) minRight = nums2[j];
            else if (j === n) minRight = nums1[i];
            else minRight = Math.min(nums1[i], nums2[j]);
            return (maxLeft + minRight) / 2;
        }
    }
}
console.log(findMedianSortedArrays([1, 3], [2])); // 2.0
```

**82. Shortest path in binary matrix**
```javascript
function shortestPathBinaryMatrix(grid) {
    if (grid[0][0] || grid[grid.length - 1][grid[0].length - 1]) return -1;
    const n = grid.length;
    const queue = [[0, 0, 1]];
    grid[0][0] = 1;
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    while (queue.length) {
        let [x, y, dist] = queue.shift();
        if (x === n - 1 && y === n - 1) return dist;
        for (let [dx, dy] of directions) {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < n && ny >= 0 && ny < n && grid[nx][ny] === 0) {
                grid[nx][ny] = 1;
                queue.push([nx, ny, dist + 1]);
            }
        }
    }
    return -1;
}
console.log(shortestPathBinaryMatrix([[0,1],[1,0]])); // 2
```

**83. Number of islands**
```javascript
function numIslands(grid) {
    if (!grid.length) return 0;
    let count = 0;
    const m = grid.length, n = grid[0].length;
    function dfs(i, j) {
        if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] === '0') return;
        grid[i][j] = '0';
        dfs(i + 1, j); dfs(i - 1, j); dfs(i, j + 1); dfs(i, j - 1);
    }
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (grid[i][j] === '1') {
                dfs(i, j);
                count++;
            }
        }
    }
    return count;
}
```

**84. Clone graph (Logic simulation)**
```javascript
function cloneGraph(node) {
    if (!node) return null;
    const clones = new Map();
    function dfs(v) {
        if (clones.has(v)) return clones.get(v);
        const clone = { val: v.val, neighbors: [] };
        clones.set(v, clone);
        for (let neighbor of v.neighbors) {
            clone.neighbors.push(dfs(neighbor));
        }
        return clone;
    }
    return dfs(node);
}
```

**85. Pacific Atlantic water flow**
```javascript
function pacificAtlantic(heights) {
    if (!heights.length) return [];
    const m = heights.length, n = heights[0].length;
    const pacific = Array.from({ length: m }, () => Array(n).fill(false));
    const atlantic = Array.from({ length: m }, () => Array(n).fill(false));
    function dfs(r, c, sea) {
        sea[r][c] = true;
        const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
        for (let [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && !sea[nr][nc] && heights[nr][nc] >= heights[r][c]) {
                dfs(nr, nc, sea);
            }
        }
    }
    for (let i = 0; i < m; i++) { dfs(i, 0, pacific); dfs(i, n - 1, atlantic); }
    for (let j = 0; j < n; j++) { dfs(0, j, pacific); dfs(m - 1, j, atlantic); }
    const result = [];
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (pacific[i][j] && atlantic[i][j]) result.push([i, j]);
        }
    }
    return result;
}
```

**86. Alien dictionary (Topological Sort)**
```javascript
function alienOrder(words) {
    const adj = new Map();
    const inDegree = new Map();
    for (let word of words) for (let c of word) { inDegree.set(c, 0); adj.set(c, new Set()); }
    for (let i = 0; i < words.length - 1; i++) {
        let w1 = words[i], w2 = words[i + 1];
        let minLen = Math.min(w1.length, w2.length);
        if (w1.length > w2.length && w1.startsWith(w2)) return "";
        for (let j = 0; j < minLen; j++) {
            if (w1[j] !== w2[j]) {
                if (!adj.get(w1[j]).has(w2[j])) {
                    adj.get(w1[j]).add(w2[j]);
                    inDegree.set(w2[j], inDegree.get(w2[j]) + 1);
                }
                break;
            }
        }
    }
    const queue = [];
    for (let [c, deg] of inDegree) if (deg === 0) queue.push(c);
    let result = "";
    while (queue.length) {
        let c = queue.shift();
        result += c;
        for (let neighbor of adj.get(c)) {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) queue.push(neighbor);
        }
    }
    return result.length === inDegree.size ? result : "";
}
```

**87. Sliding window maximum**
```javascript
function maxSlidingWindow(nums, k) {
    const deque = [];
    const result = [];
    for (let i = 0; i < nums.length; i++) {
        if (deque.length && deque[0] < i - k + 1) deque.shift();
        while (deque.length && nums[deque[deque.length - 1]] < nums[i]) deque.pop();
        deque.push(i);
        if (i >= k - 1) result.push(nums[deque[0]]);
    }
    return result;
}
console.log(maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3)); // [3,3,5,5,6,7]
```

**88. Minimum cost to hire K workers**
```javascript
function mincostToHireWorkers(quality, wage, k) {
    const workers = quality.map((q, i) => [wage[i] / q, q]).sort((a, b) => a[0] - b[0]);
    let qualitySum = 0, result = Infinity;
    const maxHeap = []; 
    // In real JS, you'd use a priority queue library. Here's a sim.
    for (let [ratio, q] of workers) {
        qualitySum += q;
        maxHeap.push(q); maxHeap.sort((a, b) => b - a);
        if (maxHeap.length > k) qualitySum -= maxHeap.shift();
        if (maxHeap.length === k) result = Math.min(result, qualitySum * ratio);
    }
    return result;
}
```

**89. Maximum profit in job scheduling**
```javascript
function jobScheduling(startTime, endTime, profit) {
    const jobs = startTime.map((s, i) => [s, endTime[i], profit[i]]).sort((a, b) => a[1] - b[1]);
    const dp = [[0, 0]]; // [endTime, maxProfit]
    for (let [s, e, p] of jobs) {
        let left = 0, right = dp.length - 1, idx = -1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (dp[mid][0] <= s) { idx = mid; left = mid + 1; }
            else right = mid - 1;
        }
        let currentProfit = (idx === -1 ? 0 : dp[idx][1]) + p;
        if (currentProfit > dp[dp.length - 1][1]) dp.push([e, currentProfit]);
    }
    return dp[dp.length - 1][1];
}
```

**90. Russian doll envelopes**
```javascript
function maxEnvelopes(envelopes) {
    envelopes.sort((a, b) => a[0] === b[0] ? b[1] - a[1] : a[0] - b[0]);
    const dp = [];
    for (let [w, h] of envelopes) {
        let left = 0, right = dp.length;
        while (left < right) {
            let mid = Math.floor((left + right) / 2);
            if (dp[mid] < h) left = mid + 1;
            else right = mid;
        }
        if (left === dp.length) dp.push(h);
        else dp[left] = h;
    }
    return dp.length;
}
```

**91. Burst balloons**
```javascript
function maxCoins(nums) {
    const arr = [1, ...nums, 1];
    const n = arr.length;
    const dp = Array.from({ length: n }, () => Array(n).fill(0));
    for (let length = 2; length < n; length++) {
        for (let left = 0; left < n - length; left++) {
            let right = left + length;
            for (let i = left + 1; i < right; i++) {
                dp[left][right] = Math.max(dp[left][right], arr[left] * arr[i] * arr[right] + dp[left][i] + dp[i][right]);
            }
        }
    }
    return dp[0][n - 1];
}
console.log(maxCoins([3,1,5,8])); // 167
```

**92. Remove invalid parentheses**
```javascript
function removeInvalidParentheses(s) {
    function isValid(str) {
        let count = 0;
        for (let char of str) {
            if (char === '(') count++;
            else if (char === ')') count--;
            if (count < 0) return false;
        }
        return count === 0;
    }
    let level = new Set([s]);
    while (true) {
        let valid = [...level].filter(isValid);
        if (valid.length) return valid;
        let nextLevel = new Set();
        for (let str of level) {
            for (let i = 0; i < str.length; i++) {
                if (str[i] === '(' || str[i] === ')') {
                    nextLevel.add(str.substring(0, i) + str.substring(i + 1));
                }
            }
        }
        if (!nextLevel.size) return [""];
        level = nextLevel;
    }
}
console.log(removeInvalidParentheses("()())()")); // ["()()()", "(())()"]
```

**93. Longest valid parentheses**
```javascript
function longestValidParentheses(s) {
    const stack = [-1];
    let maxLen = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') stack.push(i);
        else {
            stack.pop();
            if (!stack.length) stack.push(i);
            else maxLen = Math.max(maxLen, i - stack[stack.length - 1]);
        }
    }
    return maxLen;
}
console.log(longestValidParentheses("(()")); // 2
```

**94. Largest rectangle in histogram**
```javascript
function largestRectangleArea(heights) {
    const stack = [-1];
    let maxArea = 0;
    const h = [...heights, 0];
    for (let i = 0; i < h.length; i++) {
        while (stack.length > 1 && h[stack[stack.length - 1]] >= h[i]) {
            let height = h[stack.pop()];
            let width = i - stack[stack.length - 1] - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}
console.log(largestRectangleArea([2,1,5,6,2,3])); // 10
```

**95. Maximal rectangle**
```javascript
function maximalRectangle(matrix) {
    if (!matrix.length) return 0;
    let maxArea = 0;
    const heights = Array(matrix[0].length).fill(0);
    for (let row of matrix) {
        for (let i = 0; i < row.length; i++) {
            heights[i] = row[i] === '1' ? heights[i] + 1 : 0;
        }
        maxArea = Math.max(maxArea, largestRectangleArea(heights));
    }
    return maxArea;
}
```

**96. Count smaller numbers after self**
```javascript
function countSmaller(nums) {
    const result = Array(nums.length).fill(0);
    const indexed = nums.map((val, i) => [val, i]);
    function mergeSort(arr) {
        if (arr.length <= 1) return arr;
        let mid = Math.floor(arr.length / 2);
        let left = mergeSort(arr.slice(0, mid));
        let right = mergeSort(arr.slice(mid));
        let i = 0, j = 0, sorted = [];
        while (i < left.length && j < right.length) {
            if (left[i][0] <= right[j][0]) {
                result[left[i][1]] += j;
                sorted.push(left[i++]);
            } else {
                sorted.push(right[j++]);
            }
        }
        while (i < left.length) {
            result[left[i][1]] += j;
            sorted.push(left[i++]);
        }
        return [...sorted, ...right.slice(j)];
    }
    mergeSort(indexed);
    return result;
}
console.log(countSmaller([5,2,6,1])); // [2,1,1,0]
```

**97. Split array largest sum**
```javascript
function splitArray(nums, m) {
    let left = Math.max(...nums), right = nums.reduce((a, b) => a + b, 0);
    function canSplit(maxSum) {
        let count = 1, currentSum = 0;
        for (let num of nums) {
            if (currentSum + num > maxSum) { count++; currentSum = num; }
            else currentSum += num;
        }
        return count <= m;
    }
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (canSplit(mid)) right = mid;
        else left = mid + 1;
    }
    return left;
}
console.log(splitArray([7,2,5,10,8], 2)); // 18
```

**98. Binary tree maximum path sum (Mock logic)**
```javascript
function maxPathSum(root) {
    let maxSum = -Infinity;
    function dfs(node) {
        if (!node) return 0;
        let left = Math.max(0, dfs(node.left));
        let right = Math.max(0, dfs(node.right));
        maxSum = Math.max(maxSum, node.val + left + right);
        return node.val + Math.max(left, right);
    }
    dfs(root);
    return maxSum;
}
```

**99. Scramble string**
```javascript
function isScramble(s1, s2) {
    if (s1 === s2) return true;
    if (s1.split('').sort().join('') !== s2.split('').sort().join('')) return false;
    for (let i = 1; i < s1.length; i++) {
        if ((isScramble(s1.substring(0, i), s2.substring(0, i)) && isScramble(s1.substring(i), s2.substring(i))) ||
            (isScramble(s1.substring(0, i), s2.substring(s1.length - i)) && isScramble(s1.substring(i), s2.substring(0, s1.length - i)))) {
            return true;
        }
    }
    return false;
}
console.log(isScramble("great", "rgeat")); // true
```

**1️⃣0️⃣0️⃣ Palindrome partitioning II (min cuts)**
```javascript
function minCut(s) {
    const n = s.length;
    const isPal = Array.from({ length: n }, () => Array(n).fill(false));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = i; j < n; j++) {
            if (s[i] === s[j] && (j - i <= 2 || isPal[i + 1][j - 1])) isPal[i][j] = true;
        }
    }
    const dp = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        if (isPal[0][i]) dp[i] = 0;
        else {
            dp[i] = i;
            for (let j = 0; j < i; j++) {
                if (isPal[j + 1][i]) dp[i] = Math.min(dp[i], dp[j] + 1);
            }
        }
    }
    return dp[n - 1];
}
console.log(minCut("aab")); // 1
```

---
*Practice these regularly to strengthen your coding skills! 🚀*
