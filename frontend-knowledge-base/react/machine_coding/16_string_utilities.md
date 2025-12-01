# String Utilities: Reverse, Palindrome, Anagram, KMP

String manipulation and algorithm implementations.

## 1. Reverse String

### Question
Implement a function that reverses a string.

### Solution

```javascript
// Method 1: Built-in methods
function reverseString(str) {
    return str.split('').reverse().join('');
}

// Method 2: Loop
function reverseStringLoop(str) {
    let reversed = '';
    for (let i = str.length - 1; i >= 0; i--) {
        reversed += str[i];
    }
    return reversed;
}

// Method 3: Recursive
function reverseStringRecursive(str) {
    if (str.length <= 1) return str;
    return reverseStringRecursive(str.slice(1)) + str[0];
}

// Method 4: Two pointers
function reverseStringTwoPointers(str) {
    const arr = str.split('');
    let left = 0;
    let right = arr.length - 1;
    
    while (left < right) {
        [arr[left], arr[right]] = [arr[right], arr[left]];
        left++;
        right--;
    }
    
    return arr.join('');
}

// Usage
console.log(reverseString('hello')); // 'olleh'
```

---

## 2. Palindrome Check

### Question
Implement a function that determines if a string is a palindrome.

### Solution

```javascript
function isPalindrome(str) {
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleaned === cleaned.split('').reverse().join('');
}

// Two pointers approach
function isPalindromeTwoPointers(str) {
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    let left = 0;
    let right = cleaned.length - 1;
    
    while (left < right) {
        if (cleaned[left] !== cleaned[right]) {
            return false;
        }
        left++;
        right--;
    }
    
    return true;
}

// Recursive
function isPalindromeRecursive(str, left = 0, right = str.length - 1) {
    if (left >= right) return true;
    if (str[left] !== str[right]) return false;
    return isPalindromeRecursive(str, left + 1, right - 1);
}

// Usage
console.log(isPalindrome('A man a plan a canal Panama')); // true
console.log(isPalindrome('race a car')); // false
```

---

## 3. Anagram Check

### Question
Implement a function that determines if two strings are anagrams.

### Solution

```javascript
function areAnagrams(str1, str2) {
    const normalize = (str) => 
        str.toLowerCase().replace(/[^a-z]/g, '').split('').sort().join('');
    
    return normalize(str1) === normalize(str2);
}

// Character count approach
function areAnagramsCount(str1, str2) {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    
    if (s1.length !== s2.length) return false;
    
    const count1 = {};
    const count2 = {};
    
    for (let char of s1) {
        count1[char] = (count1[char] || 0) + 1;
    }
    
    for (let char of s2) {
        count2[char] = (count2[char] || 0) + 1;
    }
    
    for (let char in count1) {
        if (count1[char] !== count2[char]) {
            return false;
        }
    }
    
    return true;
}

// Usage
console.log(areAnagrams('listen', 'silent')); // true
console.log(areAnagrams('hello', 'world')); // false
```

---

## 4. Longest Substring Without Repeating Characters

### Question
Implement a function that finds the length of the longest substring without repeating characters.

### Solution

```javascript
function lengthOfLongestSubstring(s) {
    const charMap = new Map();
    let maxLength = 0;
    let start = 0;
    
    for (let end = 0; end < s.length; end++) {
        const char = s[end];
        
        if (charMap.has(char) && charMap.get(char) >= start) {
            start = charMap.get(char) + 1;
        }
        
        charMap.set(char, end);
        maxLength = Math.max(maxLength, end - start + 1);
    }
    
    return maxLength;
}

// Alternative with Set
function lengthOfLongestSubstringSet(s) {
    const charSet = new Set();
    let maxLength = 0;
    let left = 0;
    
    for (let right = 0; right < s.length; right++) {
        while (charSet.has(s[right])) {
            charSet.delete(s[left]);
            left++;
        }
        
        charSet.add(s[right]);
        maxLength = Math.max(maxLength, right - left + 1);
    }
    
    return maxLength;
}

// Usage
console.log(lengthOfLongestSubstring('abcabcbb')); // 3
console.log(lengthOfLongestSubstring('bbbbb')); // 1
console.log(lengthOfLongestSubstring('pwwkew')); // 3
```

---

## 5. String Compression

### Question
Implement a function that compresses a string using run-length encoding.

### Solution

```javascript
function compressString(str) {
    if (str.length === 0) return str;
    
    let compressed = '';
    let count = 1;
    
    for (let i = 1; i < str.length; i++) {
        if (str[i] === str[i - 1]) {
            count++;
        } else {
            compressed += str[i - 1] + (count > 1 ? count : '');
            count = 1;
        }
    }
    
    compressed += str[str.length - 1] + (count > 1 ? count : '');
    
    return compressed.length < str.length ? compressed : str;
}

// Usage
console.log(compressString('aabcccccaaa')); // 'a2bc5a3'
console.log(compressString('abcdef')); // 'abcdef' (no compression)
```

---

## 6. Valid Parentheses

### Question
Implement a function that determines if a string containing parentheses is valid.

### Solution

```javascript
function isValidParentheses(s) {
    const stack = [];
    const pairs = {
        '(': ')',
        '[': ']',
        '{': '}'
    };
    
    for (let char of s) {
        if (pairs[char]) {
            stack.push(char);
        } else if (Object.values(pairs).includes(char)) {
            if (stack.length === 0) return false;
            
            const lastOpen = stack.pop();
            if (pairs[lastOpen] !== char) {
                return false;
            }
        }
    }
    
    return stack.length === 0;
}

// Usage
console.log(isValidParentheses('()')); // true
console.log(isValidParentheses('()[]{}')); // true
console.log(isValidParentheses('([)]')); // false
console.log(isValidParentheses('{[]}')); // true
```

---

## 7. String to Integer (atoi)

### Question
Implement a function that converts a string to an integer.

### Solution

```javascript
function atoi(str) {
    str = str.trim();
    if (str.length === 0) return 0;
    
    let sign = 1;
    let index = 0;
    
    // Handle sign
    if (str[index] === '+' || str[index] === '-') {
        sign = str[index] === '-' ? -1 : 1;
        index++;
    }
    
    let result = 0;
    const INT_MAX = Math.pow(2, 31) - 1;
    const INT_MIN = -Math.pow(2, 31);
    
    while (index < str.length && /[0-9]/.test(str[index])) {
        const digit = parseInt(str[index]);
        
        // Check overflow
        if (result > Math.floor(INT_MAX / 10) || 
            (result === Math.floor(INT_MAX / 10) && digit > INT_MAX % 10)) {
            return sign === 1 ? INT_MAX : INT_MIN;
        }
        
        result = result * 10 + digit;
        index++;
    }
    
    return result * sign;
}

// Usage
console.log(atoi('42')); // 42
console.log(atoi('   -42')); // -42
console.log(atoi('4193 with words')); // 4193
console.log(atoi('words and 987')); // 0
```

---

## 8. Longest Common Prefix

### Question
Implement a function that finds the longest common prefix string amongst an array of strings.

### Solution

```javascript
function longestCommonPrefix(strs) {
    if (strs.length === 0) return '';
    if (strs.length === 1) return strs[0];
    
    let prefix = strs[0];
    
    for (let i = 1; i < strs.length; i++) {
        while (!strs[i].startsWith(prefix)) {
            prefix = prefix.slice(0, -1);
            if (prefix === '') return '';
        }
    }
    
    return prefix;
}

// Vertical scanning
function longestCommonPrefixVertical(strs) {
    if (strs.length === 0) return '';
    
    for (let i = 0; i < strs[0].length; i++) {
        const char = strs[0][i];
        
        for (let j = 1; j < strs.length; j++) {
            if (i >= strs[j].length || strs[j][i] !== char) {
                return strs[0].substring(0, i);
            }
        }
    }
    
    return strs[0];
}

// Usage
console.log(longestCommonPrefix(['flower', 'flow', 'flight'])); // 'fl'
console.log(longestCommonPrefix(['dog', 'racecar', 'car'])); // ''
```

---

## 9. KMP String Matching

### Question
Implement the Knuth-Morris-Pratt algorithm for string matching.

### Solution

```javascript
function buildLPS(pattern) {
    const lps = [0];
    let len = 0;
    let i = 1;
    
    while (i < pattern.length) {
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len !== 0) {
                len = lps[len - 1];
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
    
    return lps;
}

function kmpSearch(text, pattern) {
    if (pattern.length === 0) return 0;
    
    const lps = buildLPS(pattern);
    const indices = [];
    let i = 0; // text index
    let j = 0; // pattern index
    
    while (i < text.length) {
        if (text[i] === pattern[j]) {
            i++;
            j++;
        }
        
        if (j === pattern.length) {
            indices.push(i - j);
            j = lps[j - 1];
        } else if (i < text.length && text[i] !== pattern[j]) {
            if (j !== 0) {
                j = lps[j - 1];
            } else {
                i++;
            }
        }
    }
    
    return indices;
}

// Usage
console.log(kmpSearch('ABABDABACDABABCABCABAB', 'ABABCABAB')); // [10]
```

---

## 10. Word Break

### Question
Implement a function that determines if a string can be segmented into words from a dictionary.

### Solution

```javascript
function wordBreak(s, wordDict) {
    const wordSet = new Set(wordDict);
    const memo = new Map();
    
    function canBreak(start) {
        if (start === s.length) return true;
        if (memo.has(start)) return memo.get(start);
        
        for (let end = start + 1; end <= s.length; end++) {
            const word = s.substring(start, end);
            if (wordSet.has(word) && canBreak(end)) {
                memo.set(start, true);
                return true;
            }
        }
        
        memo.set(start, false);
        return false;
    }
    
    return canBreak(0);
}

// Usage
console.log(wordBreak('leetcode', ['leet', 'code'])); // true
console.log(wordBreak('applepenapple', ['apple', 'pen'])); // true
console.log(wordBreak('catsandog', ['cats', 'dog', 'sand', 'and', 'cat'])); // false
```

---

## Key Patterns

1. **Two Pointers**: For palindrome, reverse
2. **Sliding Window**: For substring problems
3. **Stack**: For parentheses, matching
4. **Hash Map/Set**: For character counting
5. **Dynamic Programming**: For word break
6. **KMP Algorithm**: Efficient string matching

## Best Practices

- ✅ Handle edge cases (empty, null)
- ✅ Consider time/space complexity
- ✅ Use appropriate data structures
- ✅ Optimize for large inputs
- ✅ Handle Unicode characters
- ✅ Test with various inputs

