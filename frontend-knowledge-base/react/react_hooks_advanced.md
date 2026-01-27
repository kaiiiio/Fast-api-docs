# React Hooks Advanced: Deep Dive   --- IMP

Advanced React hooks patterns for complex state management, side effects, and performance optimization.

## Advanced useState Patterns

### Functional Updates

```javascript
function Counter() {
    const [count, setCount] = useState(0);
    
    // Functional update: Use previous state
    const increment = () => {
        setCount(prevCount => prevCount + 1);
    };
    
    // Multiple updates batched
    const incrementTwice = () => {
        setCount(prev => prev + 1);
        setCount(prev => prev + 1);  // Uses updated value
    };
    
    return <button onClick={incrementTwice}>{count}</button>;
}
```

### Lazy Initialization

```javascript
function ExpensiveComponent() {
    // Lazy: Only compute initial state once
    const [data, setData] = useState(() => {
        return expensiveComputation();
    });
    
    return <div>{data}</div>;
}
```

## Advanced useEffect Patterns

### Cleanup Functions

```javascript
function ChatRoom({ roomId }) {
    useEffect(() => {
        const connection = createConnection(roomId);
        connection.connect();
        
        // Cleanup: Disconnect when component unmounts or roomId changes
        return () => {
            connection.disconnect();
        };
    }, [roomId]);
}
```

### Effect Dependencies

```javascript
function ProductPage({ productId }) {
    const [product, setProduct] = useState(null);
    
    useEffect(() => {
        let cancelled = false;
        
        async function fetchProduct() {
            const data = await getProduct(productId);
            if (!cancelled) {
                setProduct(data);
            }
        }
        
        fetchProduct();
        
        return () => {
            cancelled = true;  // Cancel if productId changes
        };
    }, [productId]);
}
```

## useReducer

**useReducer** manages complex state logic.

```javascript
import { useReducer } from 'react';

// Reducer function
function reducer(state, action) {
    switch (action.type) {
        case 'increment':
            return { count: state.count + 1 };
        case 'decrement':
            return { count: state.count - 1 };
        case 'reset':
            return { count: 0 };
        default:
            throw new Error();
    }
}

function Counter() {
    const [state, dispatch] = useReducer(reducer, { count: 0 });
    
    return (
        <div>
            <p>Count: {state.count}</p>
            <button onClick={() => dispatch({ type: 'increment' })}>+</button>
            <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
            <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
        </div>
    );
}
```

## useRef

**useRef** persists values across renders without causing re-renders.

```javascript
import { useRef, useEffect } from 'react';

function TextInput() {
    const inputRef = useRef(null);
    
    useEffect(() => {
        inputRef.current.focus();
    }, []);
    
    return <input ref={inputRef} />;
}

// Storing previous value
function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}
```

## Custom Hooks Patterns

### useFetch Hook

```javascript
function useFetch(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        let cancelled = false;
        
        async function fetchData() {
            try {
                setLoading(true);
                const response = await fetch(url);
                const data = await response.json();
                
                if (!cancelled) {
                    setData(data);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        
        fetchData();
        
        return () => {
            cancelled = true;
        };
    }, [url]);
    
    return { data, loading, error };
}
```

### useDebounce Hook

```javascript
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    
    return debouncedValue;
}

// Use
function SearchInput() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    
    useEffect(() => {
        if (debouncedSearchTerm) {
            // Perform search
            search(debouncedSearchTerm);
        }
    }, [debouncedSearchTerm]);
    
    return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

## Best Practices

1. **Hooks Rules**: Only call at top level
2. **Dependencies**: Include all dependencies
3. **Cleanup**: Clean up side effects
4. **Custom Hooks**: Extract reusable logic
5. **Performance**: Use memo, useMemo, useCallback

## Summary  --- IMP

**React Hooks Advanced:**

1. **useState**: Functional updates, lazy initialization
2. **useEffect**: Cleanup, dependencies, cancellation
3. **useReducer**: Complex state logic
4. **useRef**: Persist values, DOM references
5. **Custom Hooks**: Reusable logic

**Key Takeaway:**
Advanced hooks patterns enable complex state management and side effects. Use functional updates for state. Clean up side effects in useEffect. Use useReducer for complex state. Use useRef for values that don't trigger re-renders. Create custom hooks for reusable logic.

**Hooks Strategy:**
- Functional updates
- Cleanup side effects
- Custom hooks for reuse
- Proper dependencies
- Performance optimization

**Next Steps:**
- Learn [React Performance](react_performance.md) for optimization
- Study [React Patterns](react_patterns.md) for best practices
- Master [React Testing](react_testing.md) for testing

