# Math Utilities: Prime, Fibonacci, Factorial, GCD

Mathematical algorithm implementations.

## 1. Prime Number Check

### Question
Implement a function that checks if a number is prime.

### Solution

```javascript
function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
    }
    
    return true;
}

// Sieve of Eratosthenes - Find all primes up to n
function sieveOfEratosthenes(n) {
    const primes = [];
    const isPrime = Array(n + 1).fill(true);
    isPrime[0] = isPrime[1] = false;
    
    for (let i = 2; i * i <= n; i++) {
        if (isPrime[i]) {
            for (let j = i * i; j <= n; j += i) {
                isPrime[j] = false;
            }
        }
    }
    
    for (let i = 2; i <= n; i++) {
        if (isPrime[i]) {
            primes.push(i);
        }
    }
    
    return primes;
}

// Usage
console.log(isPrime(17)); // true
console.log(sieveOfEratosthenes(20)); // [2, 3, 5, 7, 11, 13, 17, 19]
```

---

## 2. Fibonacci Sequence

### Question
Implement functions to generate Fibonacci numbers.

### Solution

```javascript
// Recursive (inefficient)
function fibonacciRecursive(n) {
    if (n <= 1) return n;
    return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

// Memoized
function fibonacciMemoized(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 1) return n;
    
    memo[n] = fibonacciMemoized(n - 1, memo) + fibonacciMemoized(n - 2, memo);
    return memo[n];
}

// Iterative (optimal)
function fibonacciIterative(n) {
    if (n <= 1) return n;
    
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}

// Generate sequence
function fibonacciSequence(count) {
    const sequence = [0, 1];
    for (let i = 2; i < count; i++) {
        sequence[i] = sequence[i - 1] + sequence[i - 2];
    }
    return sequence.slice(0, count);
}

// Usage
console.log(fibonacciIterative(10)); // 55
console.log(fibonacciSequence(10)); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

---

## 3. Factorial

### Question
Implement a function to calculate factorial.

### Solution

```javascript
// Recursive
function factorialRecursive(n) {
    if (n <= 1) return 1;
    return n * factorialRecursive(n - 1);
}

// Iterative
function factorialIterative(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// BigInt for large numbers
function factorialBigInt(n) {
    if (n <= 1n) return 1n;
    let result = 1n;
    for (let i = 2n; i <= BigInt(n); i++) {
        result *= i;
    }
    return result;
}

// Usage
console.log(factorialIterative(5)); // 120
console.log(factorialBigInt(20)); // 2432902008176640000n
```

---

## 4. Greatest Common Divisor (GCD)

### Question
Implement a function to find the GCD of two numbers.

### Solution

```javascript
// Euclidean Algorithm (recursive)
function gcdRecursive(a, b) {
    if (b === 0) return Math.abs(a);
    return gcdRecursive(b, a % b);
}

// Euclidean Algorithm (iterative)
function gcdIterative(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    
    return a;
}

// Extended Euclidean Algorithm (also finds coefficients)
function extendedGCD(a, b) {
    if (a === 0) return { gcd: b, x: 0, y: 1 };
    
    const result = extendedGCD(b % a, a);
    const gcd = result.gcd;
    const x = result.y - Math.floor(b / a) * result.x;
    const y = result.x;
    
    return { gcd, x, y };
}

// Usage
console.log(gcdIterative(48, 18)); // 6
console.log(extendedGCD(48, 18)); // { gcd: 6, x: -1, y: 3 }
```

---

## 5. Least Common Multiple (LCM)

### Question
Implement a function to find the LCM of two numbers.

### Solution

```javascript
function lcm(a, b) {
    return Math.abs(a * b) / gcdIterative(a, b);
}

// For multiple numbers
function lcmMultiple(numbers) {
    return numbers.reduce((acc, num) => lcm(acc, num), 1);
}

// Usage
console.log(lcm(12, 18)); // 36
console.log(lcmMultiple([2, 3, 4, 5])); // 60
```

---

## 6. Power Function

### Question
Implement a function to calculate x raised to the power of n.

### Solution

```javascript
// Naive O(n)
function powerNaive(x, n) {
    if (n === 0) return 1;
    if (n < 0) return 1 / powerNaive(x, -n);
    
    let result = 1;
    for (let i = 0; i < n; i++) {
        result *= x;
    }
    return result;
}

// Fast exponentiation O(log n)
function powerFast(x, n) {
    if (n === 0) return 1;
    if (n < 0) {
        x = 1 / x;
        n = -n;
    }
    
    let result = 1;
    while (n > 0) {
        if (n % 2 === 1) {
            result *= x;
        }
        x *= x;
        n = Math.floor(n / 2);
    }
    
    return result;
}

// Recursive
function powerRecursive(x, n) {
    if (n === 0) return 1;
    if (n < 0) return 1 / powerRecursive(x, -n);
    
    if (n % 2 === 0) {
        const half = powerRecursive(x, n / 2);
        return half * half;
    } else {
        return x * powerRecursive(x, n - 1);
    }
}

// Usage
console.log(powerFast(2, 10)); // 1024
console.log(powerFast(2, -3)); // 0.125
```

---

## 7. Square Root

### Question
Implement a function to calculate square root.

### Solution

```javascript
// Binary search approach
function sqrt(x) {
    if (x < 0) return NaN;
    if (x === 0 || x === 1) return x;
    
    let left = 0;
    let right = x;
    let precision = 0.0001;
    
    while (right - left > precision) {
        const mid = (left + right) / 2;
        const square = mid * mid;
        
        if (square === x) {
            return mid;
        } else if (square < x) {
            left = mid;
        } else {
            right = mid;
        }
    }
    
    return (left + right) / 2;
}

// Newton's method
function sqrtNewton(x) {
    if (x < 0) return NaN;
    if (x === 0) return 0;
    
    let guess = x;
    const precision = 0.0001;
    
    while (Math.abs(guess * guess - x) > precision) {
        guess = (guess + x / guess) / 2;
    }
    
    return guess;
}

// Usage
console.log(sqrt(16)); // 4
console.log(sqrtNewton(25)); // 5
```

---

## 8. Permutations

### Question
Implement a function to generate all permutations of an array.

### Solution

```javascript
function permutations(arr) {
    if (arr.length <= 1) return [arr];
    
    const result = [];
    
    for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const perms = permutations(remaining);
        
        for (let perm of perms) {
            result.push([current, ...perm]);
        }
    }
    
    return result;
}

// Iterative
function permutationsIterative(arr) {
    const result = [[]];
    
    for (let num of arr) {
        const newPerms = [];
        for (let perm of result) {
            for (let i = 0; i <= perm.length; i++) {
                newPerms.push([...perm.slice(0, i), num, ...perm.slice(i)]);
            }
        }
        result.length = 0;
        result.push(...newPerms);
    }
    
    return result;
}

// Usage
console.log(permutations([1, 2, 3]));
// [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]
```

---

## 9. Combinations

### Question
Implement a function to generate all combinations of k elements from an array.

### Solution

```javascript
function combinations(arr, k) {
    if (k === 0) return [[]];
    if (k > arr.length) return [];
    
    const result = [];
    
    for (let i = 0; i <= arr.length - k; i++) {
        const current = arr[i];
        const remaining = arr.slice(i + 1);
        const combs = combinations(remaining, k - 1);
        
        for (let comb of combs) {
            result.push([current, ...comb]);
        }
    }
    
    return result;
}

// Usage
console.log(combinations([1, 2, 3, 4], 2));
// [[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]
```

---

## 10. Roman to Integer

### Question
Implement a function that converts a Roman numeral to an integer.

### Solution

```javascript
function romanToInt(s) {
    const values = {
        'I': 1,
        'V': 5,
        'X': 10,
        'L': 50,
        'C': 100,
        'D': 500,
        'M': 1000
    };
    
    let result = 0;
    
    for (let i = 0; i < s.length; i++) {
        const current = values[s[i]];
        const next = values[s[i + 1]];
        
        if (next && current < next) {
            result -= current;
        } else {
            result += current;
        }
    }
    
    return result;
}

// Usage
console.log(romanToInt('III')); // 3
console.log(romanToInt('IV')); // 4
console.log(romanToInt('LVIII')); // 58
console.log(romanToInt('MCMXCIV')); // 1994
```

---

## Key Patterns

1. **Optimization**: Memoization, iterative vs recursive
2. **Mathematical Algorithms**: GCD, LCM, prime sieve
3. **Combinatorics**: Permutations, combinations
4. **Number Theory**: Prime, factorial, power
5. **Efficient Algorithms**: Fast exponentiation, binary search
6. **Edge Cases**: Negative numbers, zero, overflow

## Best Practices

- ✅ Handle edge cases (0, 1, negative)
- ✅ Optimize for large numbers
- ✅ Use BigInt for very large numbers
- ✅ Choose appropriate algorithm
- ✅ Consider time/space complexity
- ✅ Test with various inputs

