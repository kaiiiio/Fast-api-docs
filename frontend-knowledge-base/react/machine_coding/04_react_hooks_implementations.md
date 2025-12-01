# React Hooks Implementations: Custom Hooks

Complete implementations of commonly asked React hooks in machine coding interviews.

## 1. useCounter Hook

### Question
Implement a hook that manages a counter state, with some additional convenience utility methods.

### Solution

```jsx
import { useState, useCallback } from 'react';

function useCounter(initialValue = 0, options = {}) {
    const { min, max, step = 1 } = options;
    const [count, setCount] = useState(initialValue);

    const increment = useCallback(() => {
        setCount(prev => {
            const next = prev + step;
            return max !== undefined ? Math.min(next, max) : next;
        });
    }, [step, max]);

    const decrement = useCallback(() => {
        setCount(prev => {
            const next = prev - step;
            return min !== undefined ? Math.max(next, min) : next;
        });
    }, [step, min]);

    const reset = useCallback(() => {
        setCount(initialValue);
    }, [initialValue]);

    const setValue = useCallback((value) => {
        setCount(prev => {
            let newValue = value;
            if (min !== undefined) newValue = Math.max(newValue, min);
            if (max !== undefined) newValue = Math.min(newValue, max);
            return newValue;
        });
    }, [min, max]);

    return {
        count,
        increment,
        decrement,
        reset,
        setValue
    };
}

// Usage
function Counter() {
    const { count, increment, decrement, reset } = useCounter(0, {
        min: 0,
        max: 10,
        step: 1
    });

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={increment}>+</button>
            <button onClick={decrement}>-</button>
            <button onClick={reset}>Reset</button>
        </div>
    );
}
```

### Explanation
- **State Management**: Manages counter value
- **Boundaries**: Optional min/max constraints
- **Step Size**: Configurable increment/decrement step
- **Utility Methods**: increment, decrement, reset, setValue
- **Memoization**: useCallback prevents unnecessary re-renders

---

## 2. useBoolean Hook

### Question
Implement a hook that manages a boolean state, with additional convenience utility methods.

### Solution

```jsx
import { useState, useCallback } from 'react';

function useBoolean(initialValue = false) {
    const [value, setValue] = useState(initialValue);

    const setTrue = useCallback(() => setValue(true), []);
    const setFalse = useCallback(() => setValue(false), []);
    const toggle = useCallback(() => setValue(prev => !prev), []);

    return {
        value,
        setValue,
        setTrue,
        setFalse,
        toggle
    };
}

// Usage
function ToggleButton() {
    const { value: isOpen, toggle, setTrue, setFalse } = useBoolean(false);

    return (
        <div>
            <p>Status: {isOpen ? 'Open' : 'Closed'}</p>
            <button onClick={toggle}>Toggle</button>
            <button onClick={setTrue}>Open</button>
            <button onClick={setFalse}>Close</button>
        </div>
    );
}
```

### Explanation
- **Boolean State**: Manages true/false value
- **Convenience Methods**: setTrue, setFalse, toggle
- **Flexible**: Can still use setValue directly
- **Memoized**: All methods memoized with useCallback

---

## 3. useDebounce Hook

### Question
Implement a hook that debounces a value.

### Solution

```jsx
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Usage
function SearchInput() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (debouncedSearchTerm) {
            // Perform search API call
            console.log('Searching for:', debouncedSearchTerm);
        }
    }, [debouncedSearchTerm]);

    return (
        <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
        />
    );
}
```

### Explanation
- **Debouncing**: Delays value update until delay period passes
- **Cleanup**: Clears timeout on value change or unmount
- **Use Case**: Reduces API calls in search inputs
- **Configurable**: Delay can be customized

---

## 4. useWindowSize Hook

### Question
Implement a hook that returns the current height and width of the window.

### Solution

```jsx
import { useState, useEffect } from 'react';

function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        }

        window.addEventListener('resize', handleResize);
        handleResize(); // Set initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
}

// Usage
function ResponsiveComponent() {
    const { width, height } = useWindowSize();

    return (
        <div>
            <p>Window size: {width} x {height}</p>
            {width < 768 && <p>Mobile view</p>}
            {width >= 768 && <p>Desktop view</p>}
        </div>
    );
}
```

### Explanation
- **Window Dimensions**: Tracks width and height
- **Event Listener**: Listens to resize events
- **Cleanup**: Removes listener on unmount
- **SSR Safe**: Handles server-side rendering

---

## 5. useClickOutside Hook

### Question
Implement a hook that detects clicks outside of a specified element.

### Solution

```jsx
import { useEffect, useRef } from 'react';

function useClickOutside(callback) {
    const ref = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                callback(event);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [callback]);

    return ref;
}

// Usage
function Dropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useClickOutside(() => setIsOpen(false));

    return (
        <div ref={dropdownRef} className="dropdown">
            <button onClick={() => setIsOpen(!isOpen)}>
                Toggle Dropdown
            </button>
            {isOpen && (
                <div className="dropdown-menu">
                    <div>Item 1</div>
                    <div>Item 2</div>
                </div>
            )}
        </div>
    );
}
```

### Explanation
- **Ref Management**: Returns ref to attach to element
- **Event Detection**: Listens for clicks outside element
- **Touch Support**: Handles both mouse and touch events
- **Cleanup**: Removes listeners on unmount

---

## 6. usePrevious Hook

### Question
Implement a hook that returns the previous value of a state.

### Solution

```jsx
import { useRef, useEffect } from 'react';

function usePrevious(value) {
    const ref = useRef();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

// Usage
function CounterWithPrevious() {
    const [count, setCount] = useState(0);
    const prevCount = usePrevious(count);

    return (
        <div>
            <p>Current: {count}</p>
            <p>Previous: {prevCount}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

### Explanation
- **Previous Value**: Stores previous value in ref
- **Effect Update**: Updates ref after render
- **Use Case**: Compare current vs previous values
- **Simple Pattern**: Uses ref to persist value across renders

---

## 7. useInterval Hook

### Question
Implement a hook that creates an interval that invokes a callback function at a specified delay.

### Solution

```jsx
import { useEffect, useRef } from 'react';

function useInterval(callback, delay) {
    const savedCallback = useRef();

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }

        if (delay !== null) {
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

// Usage
function Timer() {
    const [seconds, setSeconds] = useState(0);

    useInterval(() => {
        setSeconds(seconds => seconds + 1);
    }, 1000);

    return <div>Timer: {seconds}s</div>;
}
```

### Explanation
- **Interval Management**: Creates and cleans up intervals
- **Ref Pattern**: Uses ref to access latest callback
- **Conditional**: Can pause by setting delay to null
- **Cleanup**: Properly clears interval on unmount

---

## 8. useFetch Hook

### Question
Implement a hook that manages a promise resolution (for API calls).

### Solution

```jsx
import { useState, useEffect } from 'react';

function useFetch(url, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (!cancelled) {
                    setData(result);
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        }

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [url, JSON.stringify(options)]);

    return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
    const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!user) return null;

    return <div>{user.name}</div>;
}
```

### Explanation
- **Async Handling**: Manages async API calls
- **Loading State**: Tracks loading status
- **Error Handling**: Catches and stores errors
- **Cancellation**: Prevents state updates if component unmounts
- **Re-fetching**: Automatically refetches when URL changes

---

## Key Patterns

1. **useState**: For local state management
2. **useEffect**: For side effects and cleanup
3. **useRef**: For mutable values and DOM references
4. **useCallback**: For memoized functions
5. **Custom Logic**: Encapsulate reusable stateful logic
6. **Cleanup**: Always clean up effects properly

## Best Practices

- ✅ Always clean up effects (intervals, listeners)
- ✅ Use useCallback for functions returned from hooks
- ✅ Handle edge cases (null, undefined, errors)
- ✅ Make hooks composable and reusable
- ✅ Document hook parameters and return values
- ✅ Test hooks thoroughly

