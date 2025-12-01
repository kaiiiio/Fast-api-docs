# Object Utilities: Deep Clone, Merge, Pick, Omit

Object manipulation and utility functions.

## 1. Deep Clone

### Question
Implement a function that creates a deep copy of an object.

### Solution

```javascript
function deepClone(obj, visited = new WeakMap()) {
    // Handle primitives and null
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    // Handle circular references
    if (visited.has(obj)) {
        return visited.get(obj);
    }
    
    // Handle Date
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    // Handle Array
    if (Array.isArray(obj)) {
        const cloned = [];
        visited.set(obj, cloned);
        obj.forEach((item, index) => {
            cloned[index] = deepClone(item, visited);
        });
        return cloned;
    }
    
    // Handle RegExp
    if (obj instanceof RegExp) {
        return new RegExp(obj.source, obj.flags);
    }
    
    // Handle Map
    if (obj instanceof Map) {
        const cloned = new Map();
        visited.set(obj, cloned);
        obj.forEach((value, key) => {
            cloned.set(key, deepClone(value, visited));
        });
        return cloned;
    }
    
    // Handle Set
    if (obj instanceof Set) {
        const cloned = new Set();
        visited.set(obj, cloned);
        obj.forEach(value => {
            cloned.add(deepClone(value, visited));
        });
        return cloned;
    }
    
    // Handle plain objects
    const cloned = {};
    visited.set(obj, cloned);
    
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key], visited);
        }
    }
    
    return cloned;
}

// Usage
const original = {
    a: 1,
    b: { c: 2, d: [3, 4] },
    e: new Date(),
    f: new Map([['key', 'value']])
};

const cloned = deepClone(original);
```

---

## 2. Object Merge

### Question
Implement a function that deeply merges multiple objects.

### Solution

```javascript
function deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    
    return deepMerge(target, ...sources);
}

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

// Usage
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { b: { d: 3 }, e: 4 };
const merged = deepMerge({}, obj1, obj2);
// { a: 1, b: { c: 2, d: 3 }, e: 4 }
```

---

## 3. Pick Function

### Question
Implement a function that creates an object composed of the picked object properties.

### Solution

```javascript
function pick(object, keys) {
    const result = {};
    
    if (Array.isArray(keys)) {
        keys.forEach(key => {
            if (key in object) {
                result[key] = object[key];
            }
        });
    } else {
        // Single key
        if (keys in object) {
            result[keys] = object[keys];
        }
    }
    
    return result;
}

// Usage
const obj = { a: 1, b: 2, c: 3, d: 4 };
console.log(pick(obj, ['a', 'c'])); // { a: 1, c: 3 }
```

---

## 4. Omit Function

### Question
Implement a function that creates an object composed of properties that are not omitted.

### Solution

```javascript
function omit(object, keys) {
    const keysToOmit = new Set(Array.isArray(keys) ? keys : [keys]);
    const result = {};
    
    for (let key in object) {
        if (object.hasOwnProperty(key) && !keysToOmit.has(key)) {
            result[key] = object[key];
        }
    }
    
    return result;
}

// Usage
const obj = { a: 1, b: 2, c: 3, d: 4 };
console.log(omit(obj, ['b', 'd'])); // { a: 1, c: 3 }
```

---

## 5. Get Nested Value

### Question
Implement a function that gets a nested value from an object using a path string.

### Solution

```javascript
function get(object, path, defaultValue) {
    const keys = path.split('.');
    let result = object;
    
    for (let key of keys) {
        if (result == null) {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
}

// Usage
const obj = {
    user: {
        name: 'John',
        address: {
            city: 'NYC'
        }
    }
};

console.log(get(obj, 'user.name')); // 'John'
console.log(get(obj, 'user.address.city')); // 'NYC'
console.log(get(obj, 'user.age', 0)); // 0 (default)
```

---

## 6. Set Nested Value

### Question
Implement a function that sets a nested value in an object using a path string.

### Solution

```javascript
function set(object, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = object;
    
    for (let key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
    return object;
}

// Usage
const obj = {};
set(obj, 'user.name', 'John');
set(obj, 'user.address.city', 'NYC');
// { user: { name: 'John', address: { city: 'NYC' } } }
```

---

## 7. Flatten Object

### Question
Implement a function that flattens a nested object.

### Solution

```javascript
function flattenObject(obj, prefix = '', result = {}) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                flattenObject(obj[key], newKey, result);
            } else {
                result[newKey] = obj[key];
            }
        }
    }
    
    return result;
}

// Usage
const obj = {
    a: 1,
    b: {
        c: 2,
        d: {
            e: 3
        }
    }
};

console.log(flattenObject(obj));
// { a: 1, 'b.c': 2, 'b.d.e': 3 }
```

---

## 8. Unflatten Object

### Question
Implement a function that unflattens an object with dot-notation keys.

### Solution

```javascript
function unflattenObject(obj) {
    const result = {};
    
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const keys = key.split('.');
            let current = result;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!(k in current) || typeof current[k] !== 'object') {
                    current[k] = {};
                }
                current = current[k];
            }
            
            current[keys[keys.length - 1]] = obj[key];
        }
    }
    
    return result;
}

// Usage
const flat = { 'a': 1, 'b.c': 2, 'b.d.e': 3 };
console.log(unflattenObject(flat));
// { a: 1, b: { c: 2, d: { e: 3 } } }
```

---

## 9. Object Keys by Value

### Question
Implement a function that finds all keys in an object that have a specific value.

### Solution

```javascript
function keysByValue(obj, value) {
    const keys = [];
    
    for (let key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] === value) {
            keys.push(key);
        }
    }
    
    return keys;
}

// Deep search version
function keysByValueDeep(obj, value, path = '', result = []) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                keysByValueDeep(obj[key], value, currentPath, result);
            } else if (obj[key] === value) {
                result.push(currentPath);
            }
        }
    }
    
    return result;
}

// Usage
const obj = { a: 1, b: 2, c: 1, d: { e: 1 } };
console.log(keysByValue(obj, 1)); // ['a', 'c']
console.log(keysByValueDeep(obj, 1)); // ['a', 'c', 'd.e']
```

---

## 10. Object Comparison

### Question
Implement a function that compares two objects deeply.

### Solution

```javascript
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
}

// Usage
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
console.log(deepEqual(obj1, obj2)); // true
```

---

## Key Patterns

1. **Deep Operations**: Recursive traversal
2. **Circular References**: WeakMap for tracking
3. **Type Handling**: Date, Array, Map, Set
4. **Path Navigation**: Dot notation parsing
5. **Object Manipulation**: Pick, omit, merge
6. **Comparison**: Deep equality checking

## Best Practices

- ✅ Handle circular references
- ✅ Support all object types
- ✅ Preserve object structure
- ✅ Handle edge cases (null, undefined)
- ✅ Optimize for performance
- ✅ Test with complex objects

