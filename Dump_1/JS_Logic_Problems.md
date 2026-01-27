# JavaScript Logic & Pattern Problems

A comprehensive collection of JavaScript coding challenges, logic problems, and fundamental concepts.

---

## 1. Array Operations & Logic

### 1.1. Finding Missing Elements
**Problem:** Find the first missing odd number in a sequence.
```javascript
const input = [5, 7, 9, 11, 15, 17, 21, 25];
let start = input[0];
let end = input.at(-1);
let missing = [];

for (let i = start; i <= end; i++) {
  if (i % 2 !== 0 && !input.includes(i)) {
    missing.push(i);
  }
}
console.log(missing); // [ 13, 19, 23 ]
```

**Optimized (Break on first find):**
```javascript
const input = [5, 7, 9, 11, 15, 17];
for (let i = 0; i < input.length; i++) {
  let current = input[i];
  let expectedNext = current + 2;
  if (input[i + 1] !== expectedNext) {
    console.log("Missing:", expectedNext);
    break;
  }
}
```

### 1.2. Second Largest & Smallest
```javascript
// Second Largest (using Set for unique values)
function secondLargest(input) {
  let arr = [...new Set(input)].sort((a, b) => b - a);
  return arr[1];
}

// Second Smallest (Iterative - O(n))
function findSecondSmallest(arr) {
  let smallest = Infinity;
  let secondSmallest = Infinity;
  for (let val of arr) {
    if (val < smallest) {
      secondSmallest = smallest;
      smallest = val;
    } else if (val < secondSmallest && val !== smallest) {
      secondSmallest = val;
    }
  }
  return secondSmallest;
}
```

### 1.3. Duplicates & Frequencies
```javascript
// Find Duplicate Elements
function findDuplicates(arr) {
  const freq = {};
  const duplicates = [];
  for (let elem of arr) {
    freq[elem] = (freq[elem] || 0) + 1;
    if (freq[elem] === 2) duplicates.push(elem);
  }
  return duplicates;
}

// Max Occurring Character (excluding spaces)
function maxChar(str) {
  const charMap = str.split("").reduce((acc, char) => {
    if (char !== " ") {
      acc[char.toLowerCase()] = (acc[char.toLowerCase()] || 0) + 1;
    }
    return acc;
  }, {});
  return Object.entries(charMap).sort((a, b) => b[1] - a[1])[0];
}
```

---

## 2. String Manipulation

### 2.1. Reversing Strings
```javascript
// Simple Reverse
const reverse = (str) => str.split("").reverse().join("");

// Reverse word by word (e.g., "Hello World" -> "olleH dlroW")
const reverseWords = (str) => 
  str.split(" ").map(w => w.split("").reverse().join("")).join(" ");

// Iterative Reverse
function reverseIterative(str) {
  let res = "";
  for (let char of str) res = char + res;
  return res;
}
```

### 2.2. Palindrome Check
```javascript
const isPalindrome = (str) => {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean === clean.split("").reverse().join("");
};
```

---

## 3. Core JavaScript Concepts

### 3.1. Call, Apply, Bind
- **Call**: Invokes function immediately with `this` and args provided individually.
- **Apply**: Invokes function immediately with `this` and args as an array.
- **Bind**: Returns a *new* function with `this` bound, to be called later.

### 3.2. Closures & Private State
```javascript
function createCounter() {
  let count = 0;
  return () => ++count;
}
const counter = createCounter();
counter(); // 1
counter(); // 2
```

### 3.3. Promises & Async
```javascript
// Promise.all example
const p1 = Promise.resolve("Done 1");
const p2 = new Promise(res => setTimeout(() => res("Done 2"), 1000));

Promise.all([p1, p2]).then(values => console.log(values));
```

---

## 4. Patterns & Geometry

### 4.1. Pyramid Pattern
```javascript
function pyramid(n) {
  for (let i = 1; i <= n; i++) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
}
/*
    * 
   * * 
  * * * 
*/
```

### 4.2. Diamond Pattern
```javascript
function diamond(n) {
  // Top half
  for (let i = 1; i <= n; i++) console.log(' '.repeat(n - i) + '* '.repeat(i));
  // Bottom half
  for (let i = n - 1; i >= 1; i--) console.log(' '.repeat(n - i) + '* '.repeat(i));
}
```

---

## 5. Advanced Frontend Concepts

### 5.1. Fetch vs Axios
| Feature | Fetch (Native) | Axios (Library) |
| :--- | :--- | :--- |
| **Parsing** | Manual (`.json()`) | Automatic |
| **Error Handling** | Only on network failure | Non-2xx status triggers catch |
| **Interceptors** | No | Yes |
| **Timeouts** | Manual (`AbortController`) | Built-in |

### 5.2. React: Managing Personas
Use **Context API** to store a `persona` string (Admin, User, Guest).
Construct a `PrivateRoute` component that checks `persona` before rendering children or redirecting to login.

---

## 6. Miscellaneous Logic

### 6.1. Factorial (Recursion)
```javascript
const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
```

### 6.2. Sum Without Plus Sign
```javascript
function sum(a, b) {
  while (b !== 0) {
    let carry = a & b;
    a = a ^ b;
    b = carry << 1;
  }
  return a;
}
```
