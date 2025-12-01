# More JavaScript Utilities: Array Methods, Object Utilities

Additional JavaScript utility function implementations.

## 1. Array.prototype.concat

### Question
Implement the Array.prototype.concat() method.

### Solution

```javascript
Array.prototype.myConcat = function(...args) {
    const result = [...this];

    for (let arg of args) {
        if (Array.isArray(arg)) {
            result.push(...arg);
        } else {
            result.push(arg);
        }
    }

    return result;
};

// Usage
const arr1 = [1, 2, 3];
const arr2 = [4, 5];
const arr3 = arr1.myConcat(arr2, 6, [7, 8]);
console.log(arr3); // [1, 2, 3, 4, 5, 6, 7, 8]
```

---

## 2. Array.prototype.at

### Question
Implement the Array.prototype.at() method.

### Solution

```javascript
Array.prototype.myAt = function(index) {
    const length = this.length;
    
    // Convert negative index to positive
    const normalizedIndex = index < 0 ? length + index : index;
    
    // Check bounds
    if (normalizedIndex < 0 || normalizedIndex >= length) {
        return undefined;
    }
    
    return this[normalizedIndex];
};

// Usage
const arr = [1, 2, 3, 4, 5];
console.log(arr.myAt(0)); // 1
console.log(arr.myAt(-1)); // 5
console.log(arr.myAt(10)); // undefined
```

---

## 3. Compact Function

### Question
Implement a function that creates an array with all falsey values removed.

### Solution

```javascript
function compact(array) {
    return array.filter(Boolean);
}

// More explicit version
function compactExplicit(array) {
    return array.filter(item => {
        return item !== null &&
               item !== undefined &&
               item !== false &&
               item !== 0 &&
               item !== '' &&
               !Number.isNaN(item);
    });
}

// Usage
const arr = [0, 1, false, 2, '', 3, null, undefined, NaN];
console.log(compact(arr)); // [1, 2, 3]
```

---

## 4. Chunk Function

### Question
Implement a function that creates an array of elements split into smaller groups of a specified size.

### Solution

```javascript
function chunk(array, size) {
    if (size <= 0) {
        return [];
    }

    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }

    return chunks;
}

// Usage
const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
console.log(chunk(numbers, 3)); // [[1, 2, 3], [4, 5, 6], [7, 8]]
console.log(chunk(numbers, 2)); // [[1, 2], [3, 4], [5, 6], [7, 8]]
```

---

## 5. Difference Function

### Question
Implement a function that finds the difference in values between arrays.

### Solution

```javascript
function difference(array, ...valuesToExclude) {
    const excludeSet = new Set();
    
    // Flatten all values to exclude
    for (let arr of valuesToExclude) {
        for (let val of arr) {
            excludeSet.add(val);
        }
    }
    
    return array.filter(item => !excludeSet.has(item));
}

// Usage
const arr1 = [1, 2, 3, 4, 5];
const arr2 = [2, 4];
const arr3 = [3];
console.log(difference(arr1, arr2, arr3)); // [1, 5]
```

---

## 6. Group By Function

### Question
Implement a function that groups values in an array based on a function or property name.

### Solution

```javascript
function groupBy(array, iteratee) {
    const result = {};

    for (let item of array) {
        let key;

        if (typeof iteratee === 'function') {
            key = iteratee(item);
        } else if (typeof iteratee === 'string') {
            key = item[iteratee];
        } else {
            throw new TypeError('Iteratee must be a function or string');
        }

        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
    }

    return result;
}

// Usage
const users = [
    { name: 'John', age: 25 },
    { name: 'Jane', age: 25 },
    { name: 'Bob', age: 30 }
];

console.log(groupBy(users, 'age'));
// { 25: [{name: 'John', age: 25}, {name: 'Jane', age: 25}], 30: [{name: 'Bob', age: 30}] }

console.log(groupBy([1.1, 1.2, 2.1, 2.2], Math.floor));
// { 1: [1.1, 1.2], 2: [2.1, 2.2] }
```

---

## 7. Flatten Deep

### Question
Implement a function that recursively flattens an array with depth control.

### Solution

```javascript
function flattenDeep(array, depth = Infinity) {
    if (depth === 0) {
        return array.slice();
    }

    return array.reduce((acc, val) => {
        if (Array.isArray(val) && depth > 0) {
            acc.push(...flattenDeep(val, depth - 1));
        } else {
            acc.push(val);
        }
        return acc;
    }, []);
}

// Usage
const nested = [1, [2, [3, [4]], 5]];
console.log(flattenDeep(nested)); // [1, 2, 3, 4, 5]
console.log(flattenDeep(nested, 1)); // [1, 2, [3, [4]], 5]
```

---

## 8. Unique Array

### Question
Implement a function to remove all duplicate values from an array.

### Solution

```javascript
function unique(array) {
    return [...new Set(array)];
}

// For objects (by reference)
function uniqueBy(array, iteratee) {
    const seen = new Set();
    const result = [];

    for (let item of array) {
        const key = typeof iteratee === 'function' 
            ? iteratee(item) 
            : item[iteratee];
        
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }

    return result;
}

// Usage
console.log(unique([1, 2, 2, 3, 3, 4])); // [1, 2, 3, 4]

const users = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
    { id: 1, name: 'John' }
];
console.log(uniqueBy(users, 'id')); // First two only
```

---

## 9. Once Function

### Question
Implement a function that accepts a callback and restricts its invocation to at most once.

### Solution

```javascript
function once(fn) {
    let called = false;
    let result;

    return function(...args) {
        if (!called) {
            called = true;
            result = fn.apply(this, args);
        }
        return result;
    };
}

// Usage
const initialize = once(() => {
    console.log('Initialized');
    return 'done';
});

initialize(); // 'Initialized'
initialize(); // (no output, returns 'done')
```

---

## 10. Sleep Function

### Question
Implement a function that pauses for a specified duration before resuming execution.

### Solution

```javascript
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
async function example() {
    console.log('Start');
    await sleep(2000);
    console.log('After 2 seconds');
}

// With value
function sleepWithValue(ms, value) {
    return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

// Usage
const result = await sleepWithValue(1000, 'Hello');
console.log(result); // 'Hello' (after 1 second)
```

---

## Key Patterns

1. **Array Manipulation**: Transform, filter, group arrays
2. **Set Operations**: Remove duplicates, find differences
3. **Function Wrappers**: Once, memoize, debounce
4. **Async Utilities**: Sleep, delay functions
5. **Type Handling**: Handle primitives and objects
6. **Iteration**: Support functions and property names

## Best Practices

- ✅ Don't mutate input arrays
- ✅ Handle edge cases (empty, null, undefined)
- ✅ Support multiple argument types
- ✅ Use appropriate data structures (Set, Map)
- ✅ Optimize for performance
- ✅ Match native behavior

