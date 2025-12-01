# JavaScript Utilities: Array Methods, Object Utilities, Promise Utilities

Complete implementations of JavaScript utility functions commonly asked in React interviews.

## 1. Array.prototype.reduce

### Question
Implement the Array.prototype.reduce() method.

### Solution

```javascript
Array.prototype.myReduce = function(callback, initialValue) {
    if (this == null) {
        throw new TypeError('Array.prototype.reduce called on null or undefined');
    }

    if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
    }

    const array = Object(this);
    const length = array.length >>> 0; // Convert to uint32

    let accumulator = initialValue;
    let startIndex = 0;

    // If no initial value, use first element
    if (initialValue === undefined) {
        if (length === 0) {
            throw new TypeError('Reduce of empty array with no initial value');
        }
        accumulator = array[0];
        startIndex = 1;
    }

    for (let i = startIndex; i < length; i++) {
        if (i in array) {
            accumulator = callback(accumulator, array[i], i, array);
        }
    }

    return accumulator;
};

// Usage
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.myReduce((acc, num) => acc + num, 0); // 15
const product = numbers.myReduce((acc, num) => acc * num, 1); // 120
```

### Explanation
- **Callback Function**: Executes for each element
- **Accumulator**: Accumulates result across iterations
- **Initial Value**: Optional starting value
- **Edge Cases**: Handles empty array, missing initial value
- **Sparse Arrays**: Handles holes in arrays

---

## 2. Array.prototype.map

### Question
Implement the Array.prototype.map() method.

### Solution

```javascript
Array.prototype.myMap = function(callback, thisArg) {
    if (this == null) {
        throw new TypeError('Array.prototype.map called on null or undefined');
    }

    if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
    }

    const array = Object(this);
    const length = array.length >>> 0;
    const result = new Array(length);

    for (let i = 0; i < length; i++) {
        if (i in array) {
            result[i] = callback.call(thisArg, array[i], i, array);
        }
    }

    return result;
};

// Usage
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.myMap(x => x * 2); // [2, 4, 6, 8, 10]
const squared = numbers.myMap(x => x * x); // [1, 4, 9, 16, 25]
```

### Explanation
- **Transformation**: Applies callback to each element
- **New Array**: Returns new array (doesn't mutate)
- **Index Access**: Provides index to callback
- **thisArg**: Optional context for callback
- **Sparse Arrays**: Preserves array holes

---

## 3. Array.prototype.filter

### Question
Implement the Array.prototype.filter() method.

### Solution

```javascript
Array.prototype.myFilter = function(callback, thisArg) {
    if (this == null) {
        throw new TypeError('Array.prototype.filter called on null or undefined');
    }

    if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
    }

    const array = Object(this);
    const length = array.length >>> 0;
    const result = [];

    for (let i = 0; i < length; i++) {
        if (i in array) {
            const value = array[i];
            if (callback.call(thisArg, value, i, array)) {
                result.push(value);
            }
        }
    }

    return result;
};

// Usage
const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.myFilter(x => x % 2 === 0); // [2, 4, 6]
const odds = numbers.myFilter(x => x % 2 !== 0); // [1, 3, 5]
```

### Explanation
- **Predicate Function**: Tests each element
- **Filtering**: Includes elements where callback returns true
- **New Array**: Returns filtered array
- **Preserves Order**: Maintains original order
- **Sparse Arrays**: Handles holes correctly

---

## 4. Function.prototype.bind

### Question
Implement the Function.prototype.bind() function.

### Solution

```javascript
Function.prototype.myBind = function(thisArg, ...boundArgs) {
    if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.bind called on non-function');
    }

    const originalFunction = this;

    function boundFunction(...callArgs) {
        // Determine if called with 'new'
        const isNewCall = this instanceof boundFunction;

        // If called with new, use the new object as 'this'
        // Otherwise, use the bound thisArg
        const thisContext = isNewCall ? this : thisArg;

        return originalFunction.apply(thisContext, boundArgs.concat(callArgs));
    }

    // Preserve prototype chain
    if (originalFunction.prototype) {
        boundFunction.prototype = Object.create(originalFunction.prototype);
    }

    return boundFunction;
};

// Usage
const obj = {
    name: 'John',
    greet: function(greeting, punctuation) {
        return `${greeting}, ${this.name}${punctuation}`;
    }
};

const boundGreet = obj.greet.myBind({ name: 'Jane' }, 'Hello');
boundGreet('!'); // "Hello, Jane!"
```

### Explanation
- **this Binding**: Binds function to specific context
- **Partial Application**: Can bind some arguments
- **New Operator**: Handles constructor calls
- **Prototype Chain**: Preserves prototype for constructors
- **Argument Merging**: Combines bound and call arguments

---

## 5. Function.prototype.call

### Question
Implement the Function.prototype.call() function.

### Solution

```javascript
Function.prototype.myCall = function(thisArg, ...args) {
    if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.call called on non-function');
    }

    // Use global object if thisArg is null/undefined
    thisArg = thisArg != null ? Object(thisArg) : globalThis;

    // Create unique property name
    const fnSymbol = Symbol('fn');
    thisArg[fnSymbol] = this;

    // Call function with thisArg as context
    const result = thisArg[fnSymbol](...args);

    // Clean up
    delete thisArg[fnSymbol];

    return result;
};

// Usage
function greet(greeting, punctuation) {
    return `${greeting}, ${this.name}${punctuation}`;
}

const person = { name: 'John' };
greet.myCall(person, 'Hello', '!'); // "Hello, John!"
```

### Explanation
- **Context Binding**: Sets 'this' to thisArg
- **Argument Passing**: Passes arguments to function
- **Symbol Property**: Uses Symbol to avoid conflicts
- **Cleanup**: Removes temporary property
- **Null Handling**: Uses globalThis for null/undefined

---

## 6. Function.prototype.apply

### Question
Implement the Function.prototype.apply() function.

### Solution

```javascript
Function.prototype.myApply = function(thisArg, argsArray) {
    if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.apply called on non-function');
    }

    // Handle argsArray
    if (argsArray == null) {
        argsArray = [];
    }

    if (!Array.isArray(argsArray) && typeof argsArray !== 'object') {
        throw new TypeError('CreateListFromArrayLike called on non-object');
    }

    // Convert array-like to array
    const args = [];
    const length = argsArray.length >>> 0;
    for (let i = 0; i < length; i++) {
        args[i] = argsArray[i];
    }

    // Use call implementation
    return this.myCall(thisArg, ...args);
};

// Usage
function greet(greeting, punctuation) {
    return `${greeting}, ${this.name}${punctuation}`;
}

const person = { name: 'John' };
greet.myApply(person, ['Hello', '!']); // "Hello, John!"
```

### Explanation
- **Array Arguments**: Accepts arguments as array
- **Array-like Objects**: Handles array-like objects
- **Delegates to call**: Uses call internally
- **Null Handling**: Treats null as empty array
- **Type Checking**: Validates arguments

---

## 7. Flatten Array

### Question
Implement a function that recursively flattens an array into a single level deep.

### Solution

```javascript
function flatten(array, depth = Infinity) {
    if (!Array.isArray(array)) {
        throw new TypeError('Argument must be an array');
    }

    const result = [];

    function flattenHelper(arr, currentDepth) {
        for (let i = 0; i < arr.length; i++) {
            if (Array.isArray(arr[i]) && currentDepth < depth) {
                flattenHelper(arr[i], currentDepth + 1);
            } else {
                result.push(arr[i]);
            }
        }
    }

    flattenHelper(array, 0);
    return result;
}

// Alternative: Using reduce
function flattenReduce(array, depth = Infinity) {
    return depth > 0
        ? array.reduce((acc, val) => 
            acc.concat(Array.isArray(val) 
                ? flattenReduce(val, depth - 1) 
                : val), [])
        : array.slice();
}

// Usage
const nested = [1, [2, [3, [4]], 5]];
flatten(nested); // [1, 2, 3, 4, 5]
flatten(nested, 1); // [1, 2, [3, [4]], 5]
```

### Explanation
- **Recursive Flattening**: Recursively processes nested arrays
- **Depth Control**: Optional depth parameter
- **Multiple Approaches**: Helper function or reduce
- **Type Safety**: Validates input
- **Preserves Values**: Maintains non-array values

---

## 8. Deep Equal

### Question
Implement a function that determines if two values are equal (deep comparison).

### Solution

```javascript
function deepEqual(a, b) {
    // Primitive comparison
    if (a === b) {
        return true;
    }

    // Handle null and undefined
    if (a == null || b == null) {
        return a === b;
    }

    // Type check
    if (typeof a !== typeof b) {
        return false;
    }

    // Array comparison
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    // Object comparison
    if (typeof a === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) {
            return false;
        }

        for (let key of keysA) {
            if (!keysB.includes(key)) {
                return false;
            }
            if (!deepEqual(a[key], b[key])) {
                return false;
            }
        }

        return true;
    }

    return false;
}

// Usage
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
deepEqual(obj1, obj2); // true

const arr1 = [1, [2, 3]];
const arr2 = [1, [2, 3]];
deepEqual(arr1, arr2); // true
```

### Explanation
- **Deep Comparison**: Recursively compares nested structures
- **Type Checking**: Ensures same types
- **Array Handling**: Compares array elements
- **Object Handling**: Compares object properties
- **Edge Cases**: Handles null, undefined, primitives

---

## 9. JSON.stringify Implementation

### Question
Implement a function that converts a JavaScript value into a JSON string.

### Solution

```javascript
function stringify(value) {
    // Handle null
    if (value === null) {
        return 'null';
    }

    // Handle primitives
    if (typeof value === 'string') {
        return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
        return undefined; // These are not JSON-serializable
    }

    // Handle arrays
    if (Array.isArray(value)) {
        const items = value.map(item => {
            const str = stringify(item);
            return str === undefined ? 'null' : str;
        });
        return `[${items.join(',')}]`;
    }

    // Handle objects
    if (typeof value === 'object') {
        const pairs = [];
        for (let key in value) {
            if (value.hasOwnProperty(key)) {
                const val = stringify(value[key]);
                if (val !== undefined) {
                    pairs.push(`"${key}":${val}`);
                }
            }
        }
        return `{${pairs.join(',')}}`;
    }

    return undefined;
}

// Usage
const obj = {
    name: 'John',
    age: 30,
    hobbies: ['reading', 'coding'],
    address: {
        city: 'New York',
        zip: '10001'
    }
};

stringify(obj);
// '{"name":"John","age":30,"hobbies":["reading","coding"],"address":{"city":"New York","zip":"10001"}}'
```

### Explanation
- **Type Handling**: Handles all JSON-serializable types
- **String Escaping**: Escapes special characters
- **Recursive**: Handles nested structures
- **Non-serializable**: Returns undefined for functions, symbols
- **Order Preservation**: Maintains object key order

---

## 10. Classnames Function

### Question
Implement a function that conditionally joins CSS class names together.

### Solution

```javascript
function classnames(...args) {
    const classes = [];

    for (let arg of args) {
        if (!arg) continue;

        const argType = typeof arg;

        if (argType === 'string' || argType === 'number') {
            classes.push(String(arg));
        } else if (Array.isArray(arg)) {
            const inner = classnames(...arg);
            if (inner) {
                classes.push(inner);
            }
        } else if (argType === 'object') {
            for (let key in arg) {
                if (arg.hasOwnProperty(key) && arg[key]) {
                    classes.push(key);
                }
            }
        }
    }

    return classes.join(' ');
}

// Usage
classnames('foo', 'bar'); // 'foo bar'
classnames('foo', { bar: true, baz: false }); // 'foo bar'
classnames(['foo', 'bar']); // 'foo bar'
classnames('foo', { bar: true }, ['baz', { qux: true }]); // 'foo bar baz qux'
```

### Explanation
- **Multiple Arguments**: Accepts any number of arguments
- **Type Handling**: Handles strings, objects, arrays
- **Conditional**: Object keys included if value is truthy
- **Nested**: Handles nested arrays and objects
- **Falsy Values**: Ignores null, undefined, false, 0, ''

---

## Key Patterns

1. **Polyfills**: Implementing built-in methods
2. **Type Checking**: Validating input types
3. **Recursion**: For nested structures
4. **Edge Cases**: Handling null, undefined, empty
5. **Context Binding**: Managing 'this' context
6. **Array Methods**: Transforming and filtering

## Best Practices

- ✅ Match native behavior exactly
- ✅ Handle all edge cases
- ✅ Type checking and validation
- ✅ Preserve original behavior
- ✅ Test with various inputs
- ✅ Document limitations

