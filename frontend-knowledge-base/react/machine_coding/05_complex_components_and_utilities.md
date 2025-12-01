# Complex Components & JavaScript Utilities

Complete solutions for complex React components and JavaScript utility functions commonly asked in interviews.

## 1. Tic-Tac-Toe Game

### Question
Build a tic-tac-toe game that is playable by two players.

### Solution

```jsx
import React, { useState } from 'react';

function TicTacToe() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState(null);

    const calculateWinner = (squares) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];

        for (let line of lines) {
            const [a, b, c] = line;
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    const handleClick = (index) => {
        if (board[index] || winner) return;

        const newBoard = [...board];
        newBoard[index] = isXNext ? 'X' : 'O';
        
        setBoard(newBoard);
        setIsXNext(!isXNext);
        
        const gameWinner = calculateWinner(newBoard);
        if (gameWinner) {
            setWinner(gameWinner);
        } else if (newBoard.every(cell => cell !== null)) {
            setWinner('Draw');
        }
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
    };

    const renderSquare = (index) => (
        <button
            className="square"
            onClick={() => handleClick(index)}
            disabled={board[index] || winner}
        >
            {board[index]}
        </button>
    );

    const status = winner
        ? winner === 'Draw' ? 'Game Draw!' : `Winner: ${winner}`
        : `Next player: ${isXNext ? 'X' : 'O'}`;

    return (
        <div className="tic-tac-toe">
            <div className="status">{status}</div>
            <div className="board">
                {Array(3).fill(null).map((_, row) => (
                    <div key={row} className="board-row">
                        {Array(3).fill(null).map((_, col) => {
                            const index = row * 3 + col;
                            return renderSquare(index);
                        })}
                    </div>
                ))}
            </div>
            <button onClick={resetGame} className="reset-button">
                Reset Game
            </button>
        </div>
    );
}
```

### CSS

```css
.tic-tac-toe {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.status {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.board {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: #333;
    padding: 2px;
}

.board-row {
    display: flex;
    gap: 2px;
}

.square {
    width: 100px;
    height: 100px;
    font-size: 2rem;
    font-weight: bold;
    border: none;
    background: white;
    cursor: pointer;
    transition: background 0.2s;
}

.square:hover:not(:disabled) {
    background: #f0f0f0;
}

.square:disabled {
    cursor: not-allowed;
}

.reset-button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
```

### Explanation
- **Game State**: 3x3 board array, current player, winner
- **Win Detection**: Checks all winning combinations
- **Turn Management**: Alternates between X and O
- **Game Over**: Detects win or draw
- **Reset**: Clears board and resets state

---

## 2. Stopwatch Component

### Question
Build a stopwatch widget that can measure how much time has passed.

### Solution

```jsx
import React, { useState, useEffect, useRef } from 'react';

function Stopwatch() {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTime(prev => prev + 10); // Update every 10ms for precision
            }, 10);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning]);

    const start = () => setIsRunning(true);
    const stop = () => setIsRunning(false);
    const reset = () => {
        setTime(0);
        setIsRunning(false);
    };

    const formatTime = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10);

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };

    return (
        <div className="stopwatch">
            <div className="time-display">
                {formatTime(time)}
            </div>
            <div className="controls">
                {!isRunning ? (
                    <button onClick={start}>Start</button>
                ) : (
                    <button onClick={stop}>Stop</button>
                )}
                <button onClick={reset}>Reset</button>
            </div>
        </div>
    );
}
```

### Explanation
- **Time Tracking**: Tracks milliseconds for precision
- **Interval Management**: Uses setInterval with cleanup
- **State Control**: Start, stop, reset functionality
- **Time Formatting**: Formats as MM:SS.MS
- **Precision**: Updates every 10ms for smooth display

---

## 3. Debounce Function

### Question
Implement a function to limit how many times a function can be executed by delaying the execution.

### Solution

```jsx
function debounce(func, delay) {
    let timeoutId;

    return function debounced(...args) {
        const context = this;

        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

// Enhanced version with cancel and flush
function debounceAdvanced(func, delay) {
    let timeoutId;
    let lastArgs;
    let lastContext;

    const debounced = function(...args) {
        lastArgs = args;
        lastContext = this;

        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
            func.apply(lastContext, lastArgs);
            lastArgs = null;
            lastContext = null;
        }, delay);
    };

    debounced.cancel = function() {
        clearTimeout(timeoutId);
        lastArgs = null;
        lastContext = null;
    };

    debounced.flush = function() {
        clearTimeout(timeoutId);
        if (lastArgs) {
            func.apply(lastContext, lastArgs);
            lastArgs = null;
            lastContext = null;
        }
    };

    return debounced;
}

// Usage
const debouncedSearch = debounce((query) => {
    console.log('Searching for:', query);
}, 500);

// React usage
function SearchInput() {
    const [query, setQuery] = useState('');

    const debouncedSearch = useMemo(
        () => debounce((searchTerm) => {
            // API call
            console.log('Search:', searchTerm);
        }, 500),
        []
    );

    useEffect(() => {
        if (query) {
            debouncedSearch(query);
        }
    }, [query, debouncedSearch]);

    return (
        <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
        />
    );
}
```

### Explanation
- **Delay Execution**: Waits for delay before executing
- **Cancel Previous**: Clears previous timeout on new call
- **Context Preservation**: Maintains `this` context
- **Cancel Method**: Cancel pending execution
- **Flush Method**: Execute immediately

---

## 4. Throttle Function

### Question
Implement a function to control the execution of a function by limiting how many times it can execute over time.

### Solution

```jsx
function throttle(func, delay) {
    let lastCallTime = 0;
    let timeoutId = null;

    return function throttled(...args) {
        const context = this;
        const currentTime = Date.now();
        const timeSinceLastCall = currentTime - lastCallTime;

        if (timeSinceLastCall >= delay) {
            // Enough time has passed, execute immediately
            func.apply(context, args);
            lastCallTime = currentTime;
        } else {
            // Schedule execution for remaining time
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(context, args);
                lastCallTime = Date.now();
            }, delay - timeSinceLastCall);
        }
    };
}

// Leading and trailing options
function throttleAdvanced(func, delay, options = {}) {
    const { leading = true, trailing = true } = options;
    let lastCallTime = 0;
    let timeoutId = null;
    let lastArgs = null;
    let lastContext = null;

    const throttled = function(...args) {
        const context = this;
        const currentTime = Date.now();
        const timeSinceLastCall = currentTime - lastCallTime;

        lastArgs = args;
        lastContext = context;

        if (timeSinceLastCall >= delay) {
            if (leading) {
                func.apply(context, args);
                lastCallTime = currentTime;
            }
        } else if (trailing && !timeoutId) {
            timeoutId = setTimeout(() => {
                if (trailing && lastArgs) {
                    func.apply(lastContext, lastArgs);
                }
                lastCallTime = Date.now();
                timeoutId = null;
                lastArgs = null;
                lastContext = null;
            }, delay - timeSinceLastCall);
        }
    };

    throttled.cancel = function() {
        clearTimeout(timeoutId);
        timeoutId = null;
        lastArgs = null;
        lastContext = null;
    };

    return throttled;
}

// Usage
const throttledScroll = throttle(() => {
    console.log('Scroll event');
}, 100);

window.addEventListener('scroll', throttledScroll);
```

### Explanation
- **Rate Limiting**: Limits function execution frequency
- **Time-based**: Ensures function runs at most once per delay period
- **Leading/Trailing**: Options for immediate or delayed execution
- **Cancel Support**: Can cancel pending execution

---

## 5. Deep Clone Function

### Question
Implement a function that performs a deep copy of a value.

### Solution

```jsx
function deepClone(value) {
    // Handle primitives and null
    if (value === null || typeof value !== 'object') {
        return value;
    }

    // Handle Date
    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    // Handle Array
    if (Array.isArray(value)) {
        return value.map(item => deepClone(item));
    }

    // Handle RegExp
    if (value instanceof RegExp) {
        return new RegExp(value);
    }

    // Handle Object
    const cloned = {};
    for (let key in value) {
        if (value.hasOwnProperty(key)) {
            cloned[key] = deepClone(value[key]);
        }
    }

    return cloned;
}

// Version with circular reference handling
function deepCloneCircular(value, visited = new WeakMap()) {
    if (value === null || typeof value !== 'object') {
        return value;
    }

    // Check for circular reference
    if (visited.has(value)) {
        return visited.get(value);
    }

    let cloned;

    if (value instanceof Date) {
        cloned = new Date(value.getTime());
    } else if (Array.isArray(value)) {
        cloned = [];
        visited.set(value, cloned);
        cloned = value.map(item => deepCloneCircular(item, visited));
    } else if (value instanceof RegExp) {
        cloned = new RegExp(value);
    } else {
        cloned = {};
        visited.set(value, cloned);
        for (let key in value) {
            if (value.hasOwnProperty(key)) {
                cloned[key] = deepCloneCircular(value[key], visited);
            }
        }
    }

    return cloned;
}

// Usage
const original = {
    name: 'John',
    age: 30,
    address: {
        city: 'New York',
        zip: '10001'
    },
    hobbies: ['reading', 'coding']
};

const cloned = deepClone(original);
cloned.address.city = 'Boston'; // Doesn't affect original
```

### Explanation
- **Recursive Cloning**: Recursively clones nested structures
- **Type Handling**: Handles Date, Array, RegExp, Object
- **Circular References**: WeakMap tracks visited objects
- **Deep Copy**: All nested values are cloned

---

## 6. Memoize Function

### Question
Implement a function that returns a memoized version of a function.

### Solution

```jsx
// Simple memoize for single argument
function memoize(fn) {
    const cache = new Map();

    return function memoized(arg) {
        if (cache.has(arg)) {
            return cache.get(arg);
        }

        const result = fn(arg);
        cache.set(arg, result);
        return result;
    };
}

// Memoize for multiple arguments
function memoizeAdvanced(fn) {
    const cache = new Map();

    return function memoized(...args) {
        const key = JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

// Usage
const expensiveFunction = (n) => {
    console.log('Computing...');
    return n * 2;
};

const memoized = memoize(expensiveFunction);

memoized(5);  // Computing... returns 10
memoized(5);  // returns 10 (from cache)
memoized(3);  // Computing... returns 6
```

### Explanation
- **Caching**: Stores results in Map
- **Key Generation**: Uses arguments as cache key
- **Performance**: Avoids recomputation for same inputs
- **Memory Trade-off**: Uses memory to save computation

---

## 7. Promise.all Implementation

### Question
Implement the Promise.all() function.

### Solution

```jsx
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

        promises.forEach((promise, index) => {
            Promise.resolve(promise)
                .then(value => {
                    results[index] = value;
                    completedCount++;

                    if (completedCount === promises.length) {
                        resolve(results);
                    }
                })
                .catch(reject);
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
- **Parallel Execution**: All promises execute in parallel
- **Fail Fast**: Rejects immediately on first rejection
- **Order Preservation**: Results in same order as input
- **Edge Cases**: Handles empty array, non-promises

---

## Key Patterns

1. **Game Logic**: State management for game mechanics
2. **Timer Management**: Interval cleanup and precision
3. **Function Wrappers**: Debounce, throttle, memoize
4. **Deep Operations**: Recursive algorithms
5. **Promise Handling**: Async operation management
6. **Performance**: Optimization techniques

## Best Practices

- ✅ Always clean up intervals and timeouts
- ✅ Handle edge cases (null, undefined, empty)
- ✅ Preserve function context (this)
- ✅ Use WeakMap for circular references
- ✅ Test with various inputs
- ✅ Document time/space complexity

