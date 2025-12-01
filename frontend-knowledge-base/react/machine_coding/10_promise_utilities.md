# Promise Utilities: Promise.all, Promise.race, Promise.any, Promisify

Complete implementations of Promise utility functions.

## 1. Promise.all Implementation

### Question
Implement the Promise.all() function that resolves to an array of results if all the input elements are resolved or rejects otherwise.

### Solution

```javascript
function promiseAll(promises) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(promises)) {
            return reject(new TypeError('Argument must be an array'));
        }

        if (promises.length === 0) {
            return resolve([]);
        }

        const results = [];
        let completedCount = 0;
        let hasRejected = false;

        promises.forEach((promise, index) => {
            Promise.resolve(promise)
                .then(value => {
                    if (hasRejected) return;

                    results[index] = value;
                    completedCount++;

                    if (completedCount === promises.length) {
                        resolve(results);
                    }
                })
                .catch(error => {
                    if (!hasRejected) {
                        hasRejected = true;
                        reject(error);
                    }
                });
        });
    });
}

// Usage
const promises = [
    Promise.resolve(1),
    Promise.resolve(2),
    Promise.resolve(3)
];

promiseAll(promises).then(results => {
    console.log(results); // [1, 2, 3]
});

// With rejection
const mixedPromises = [
    Promise.resolve(1),
    Promise.reject('Error'),
    Promise.resolve(3)
];

promiseAll(mixedPromises).catch(error => {
    console.log(error); // 'Error'
});
```

### Explanation
- **Parallel Execution**: All promises execute simultaneously
- **Fail Fast**: Rejects immediately on first rejection
- **Order Preservation**: Results in same order as input
- **Type Handling**: Converts non-promises to promises
- **Edge Cases**: Handles empty array

---

## 2. Promise.race Implementation

### Question
Implement the Promise.race() function that resolves or rejects when any of the input elements are resolved or rejected.

### Solution

```javascript
function promiseRace(promises) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(promises)) {
            return reject(new TypeError('Argument must be an array'));
        }

        if (promises.length === 0) {
            return; // Never resolves or rejects
        }

        promises.forEach(promise => {
            Promise.resolve(promise)
                .then(value => {
                    resolve(value);
                })
                .catch(error => {
                    reject(error);
                });
        });
    });
}

// Usage
const promises = [
    new Promise(resolve => setTimeout(() => resolve('Fast'), 100)),
    new Promise(resolve => setTimeout(() => resolve('Slow'), 1000))
];

promiseRace(promises).then(result => {
    console.log(result); // 'Fast'
});
```

### Explanation
- **First to Settle**: Resolves/rejects with first settled promise
- **Race Condition**: Winner takes all
- **No Cleanup**: Other promises continue
- **Type Handling**: Converts non-promises

---

## 3. Promise.any Implementation

### Question
Implement the Promise.any() function that resolves when any of the input elements are resolved.

### Solution

```javascript
function promiseAny(promises) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(promises)) {
            return reject(new TypeError('Argument must be an array'));
        }

        if (promises.length === 0) {
            return reject(new AggregateError([], 'All promises rejected'));
        }

        const errors = [];
        let rejectedCount = 0;

        promises.forEach((promise, index) => {
            Promise.resolve(promise)
                .then(value => {
                    resolve(value);
                })
                .catch(error => {
                    errors[index] = error;
                    rejectedCount++;

                    if (rejectedCount === promises.length) {
                        reject(new AggregateError(errors, 'All promises rejected'));
                    }
                });
        });
    });
}

// Usage
const promises = [
    Promise.reject('Error 1'),
    Promise.resolve('Success'),
    Promise.reject('Error 2')
];

promiseAny(promises).then(result => {
    console.log(result); // 'Success'
});

// All rejected
const allRejected = [
    Promise.reject('Error 1'),
    Promise.reject('Error 2')
];

promiseAny(allRejected).catch(error => {
    console.log(error); // AggregateError
});
```

### Explanation
- **First Success**: Resolves with first fulfilled promise
- **All Rejected**: Rejects with AggregateError if all fail
- **Error Collection**: Collects all errors
- **Type Handling**: Converts non-promises

---

## 4. Promise.allSettled Implementation

### Question
Implement the Promise.allSettled() function.

### Solution

```javascript
function promiseAllSettled(promises) {
    return new Promise((resolve) => {
        if (!Array.isArray(promises)) {
            return resolve([]);
        }

        if (promises.length === 0) {
            return resolve([]);
        }

        const results = [];
        let completedCount = 0;

        promises.forEach((promise, index) => {
            Promise.resolve(promise)
                .then(value => {
                    results[index] = {
                        status: 'fulfilled',
                        value
                    };
                    completedCount++;

                    if (completedCount === promises.length) {
                        resolve(results);
                    }
                })
                .catch(reason => {
                    results[index] = {
                        status: 'rejected',
                        reason
                    };
                    completedCount++;

                    if (completedCount === promises.length) {
                        resolve(results);
                    }
                });
        });
    });
}

// Usage
const promises = [
    Promise.resolve(1),
    Promise.reject('Error'),
    Promise.resolve(3)
];

promiseAllSettled(promises).then(results => {
    console.log(results);
    // [
    //   { status: 'fulfilled', value: 1 },
    //   { status: 'rejected', reason: 'Error' },
    //   { status: 'fulfilled', value: 3 }
    // ]
});
```

### Explanation
- **Wait for All**: Waits for all promises to settle
- **No Rejection**: Never rejects, always resolves
- **Status Tracking**: Tracks fulfilled/rejected status
- **Complete Results**: Returns all outcomes

---

## 5. Promisify Function

### Question
Implement a function that takes a function following the common error-first callback style and returns a version that returns promises.

### Solution

```javascript
function promisify(fn) {
    return function promisified(...args) {
        return new Promise((resolve, reject) => {
            function callback(error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }

            args.push(callback);
            fn.apply(this, args);
        });
    };
}

// Enhanced version with custom callback
function promisifyAdvanced(fn, customCallback) {
    return function promisified(...args) {
        return new Promise((resolve, reject) => {
            function callback(...results) {
                if (customCallback) {
                    const { error, value } = customCallback(...results);
                    if (error) {
                        reject(error);
                    } else {
                        resolve(value);
                    }
                } else {
                    // Default: error-first callback
                    const [error, ...rest] = results;
                    if (error) {
                        reject(error);
                    } else {
                        resolve(rest.length === 1 ? rest[0] : rest);
                    }
                }
            }

            args.push(callback);
            fn.apply(this, args);
        });
    };
}

// Usage
const fs = require('fs');
const readFile = promisify(fs.readFile);

readFile('file.txt', 'utf8')
    .then(content => console.log(content))
    .catch(error => console.error(error));
```

### Explanation
- **Callback to Promise**: Converts callback-based to promise-based
- **Error Handling**: Handles error-first callbacks
- **Custom Callbacks**: Supports custom callback patterns
- **Context Preservation**: Maintains 'this' context
- **Multiple Results**: Handles single or multiple return values

---

## 6. Promise.resolve Implementation

### Question
Implement a function to resolve a given value to a Promise.

### Solution

```javascript
function promiseResolve(value) {
    // If value is already a promise, return it
    if (value && typeof value.then === 'function') {
        return value;
    }

    // If value is a thenable, convert it
    if (value && typeof value === 'object' && 'then' in value) {
        return new Promise((resolve, reject) => {
            value.then(resolve, reject);
        });
    }

    // Otherwise, return resolved promise with value
    return new Promise(resolve => resolve(value));
}

// Usage
promiseResolve(42).then(value => console.log(value)); // 42
promiseResolve(Promise.resolve(100)).then(value => console.log(value)); // 100
```

### Explanation
- **Promise Handling**: Returns promise if already a promise
- **Thenable Handling**: Handles thenable objects
- **Value Wrapping**: Wraps non-promise values
- **Flattening**: Doesn't double-wrap promises

---

## 7. Promise.reject Implementation

### Question
Implement a function to return a Promise object rejected with a reason.

### Solution

```javascript
function promiseReject(reason) {
    return new Promise((resolve, reject) => {
        reject(reason);
    });
}

// Usage
promiseReject('Error occurred')
    .catch(error => console.error(error)); // 'Error occurred'
```

### Explanation
- **Simple Rejection**: Always rejects with reason
- **No Resolution**: Never resolves
- **Error Propagation**: Rejects immediately

---

## 8. Promise Timeout

### Question
Implement a function that resolves a promise if it is fulfilled within a timeout period and rejects otherwise.

### Solution

```javascript
function promiseTimeout(promise, timeout) {
    return Promise.race([
        promise,
        new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('Promise timeout'));
            }, timeout);
        })
    ]);
}

// Usage
const slowPromise = new Promise(resolve => {
    setTimeout(() => resolve('Success'), 5000);
});

promiseTimeout(slowPromise, 2000)
    .then(result => console.log(result))
    .catch(error => console.error(error)); // 'Promise timeout'
```

### Explanation
- **Race Pattern**: Uses Promise.race
- **Timeout Handling**: Rejects after timeout
- **Success Handling**: Resolves if promise fulfills first
- **Error Messages**: Clear timeout error

---

## Key Patterns

1. **Promise Construction**: Creating promises manually
2. **Race Conditions**: Handling first-to-settle
3. **Error Handling**: Proper error propagation
4. **Type Conversion**: Converting callbacks to promises
5. **Aggregation**: Collecting multiple results
6. **Timeout Patterns**: Adding timeouts to promises

## Best Practices

- ✅ Handle all edge cases
- ✅ Preserve promise behavior
- ✅ Proper error handling
- ✅ Type checking
- ✅ Order preservation
- ✅ Clean rejection handling

