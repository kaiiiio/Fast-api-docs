# React Hooks Complete Guide: All Hooks with Examples

Complete guide to all React hooks including new ones.

## 1. useState

### Question
How to use useState hook for state management.

### Solution

```jsx
import { useState } from 'react';

// Basic usage
function Counter() {
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}

// Functional update
function Counter2() {
    const [count, setCount] = useState(0);
    
    const increment = () => {
        setCount(prev => prev + 1); // Use previous value
    };
    
    return <button onClick={increment}>{count}</button>;
}

// Object state
function Form() {
    const [formData, setFormData] = useState({ name: '', email: '' });
    
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    return (
        <input
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
        />
    );
}
```

---

## 2. useEffect

### Question
How to use useEffect for side effects.

### Solution

```jsx
import { useEffect, useState } from 'react';

// Run on mount
function Component1() {
    useEffect(() => {
        console.log('Component mounted');
    }, []); // Empty deps = run once
    
    return <div>Component</div>;
}

// Run on dependency change
function Component2({ userId }) {
    useEffect(() => {
        fetchUser(userId);
    }, [userId]); // Run when userId changes
    
    return <div>User: {userId}</div>;
}

// Cleanup
function Component3() {
    useEffect(() => {
        const timer = setInterval(() => {
            console.log('Tick');
        }, 1000);
        
        return () => {
            clearInterval(timer); // Cleanup
        };
    }, []);
    
    return <div>Timer</div>;
}

// Multiple effects
function Component4() {
    useEffect(() => {
        // Effect 1
    }, [dep1]);
    
    useEffect(() => {
        // Effect 2
    }, [dep2]);
    
    return <div>Multiple effects</div>;
}
```

### Visual Flow

```
Component Mount
       │
       ▼
┌──────────────┐
│  useEffect   │
│   runs       │
└──────┬───────┘
       │
       ├─ Setup
       │
       ▼
Component Update (if deps change)
       │
       ▼
┌──────────────┐
│  Cleanup     │
│  (previous)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  useEffect   │
│   runs again │
└──────────────┘
```

---

## 3. useContext

### Question
How to use useContext for global state.

### Solution

```jsx
import { createContext, useContext, useState } from 'react';

// Create context
const ThemeContext = createContext();

// Provider component
function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    
    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Consumer component
function ThemedButton() {
    const { theme, setTheme } = useContext(ThemeContext);
    
    return (
        <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={theme}
        >
            Current theme: {theme}
        </button>
    );
}

// Usage
function App() {
    return (
        <ThemeProvider>
            <ThemedButton />
        </ThemeProvider>
    );
}
```

---

## 4. useReducer

### Question
How to use useReducer for complex state.

### Solution

```jsx
import { useReducer } from 'react';

// Reducer function
function counterReducer(state, action) {
    switch (action.type) {
        case 'increment':
            return { count: state.count + 1 };
        case 'decrement':
            return { count: state.count - 1 };
        case 'reset':
            return { count: 0 };
        case 'set':
            return { count: action.value };
        default:
            return state;
    }
}

// Component
function Counter() {
    const [state, dispatch] = useReducer(counterReducer, { count: 0 });
    
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

### Reducer Flow

```
Action dispatched
       │
       ▼
┌──────────────┐
│   dispatch   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   reducer    │
│  (function)  │
└──────┬───────┘
       │
       ├─ Current state
       ├─ Action
       │
       ▼
┌──────────────┐
│  New state   │
└──────────────┘
```

---

## 5. useMemo

### Question
How to use useMemo for expensive calculations.

### Solution

```jsx
import { useMemo, useState } from 'react';

function ExpensiveComponent({ items, filter }) {
    // Expensive calculation - only runs when items or filter change
    const filteredItems = useMemo(() => {
        console.log('Filtering items...');
        return items.filter(item => item.category === filter);
    }, [items, filter]);
    
    return (
        <div>
            {filteredItems.map(item => (
                <div key={item.id}>{item.name}</div>
            ))}
        </div>
    );
}

// Memoized object
function Component({ user }) {
    const userInfo = useMemo(() => ({
        name: user.name,
        age: user.age,
        fullName: `${user.firstName} ${user.lastName}`
    }), [user.name, user.age, user.firstName, user.lastName]);
    
    return <ChildComponent user={userInfo} />;
}
```

---

## 6. useCallback

### Question
How to use useCallback to memoize functions.

### Solution

```jsx
import { useCallback, useState } from 'react';

function Parent() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    
    // Memoized callback - only recreates when count changes
    const handleClick = useCallback(() => {
        console.log('Clicked', count);
    }, [count]);
    
    return (
        <div>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <ChildComponent onClick={handleClick} />
        </div>
    );
}

function ChildComponent({ onClick }) {
    // This won't re-render unnecessarily
    return <button onClick={onClick}>Click me</button>;
}
```

---

## 7. useRef

### Question
How to use useRef for DOM access and mutable values.

### Solution

```jsx
import { useRef, useEffect } from 'react';

// DOM reference
function InputFocus() {
    const inputRef = useRef(null);
    
    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    
    return <input ref={inputRef} />;
}

// Mutable value (doesn't cause re-render)
function Timer() {
    const [count, setCount] = useState(0);
    const intervalRef = useRef(null);
    
    const start = () => {
        intervalRef.current = setInterval(() => {
            setCount(prev => prev + 1);
        }, 1000);
    };
    
    const stop = () => {
        clearInterval(intervalRef.current);
    };
    
    return (
        <div>
            <p>{count}</p>
            <button onClick={start}>Start</button>
            <button onClick={stop}>Stop</button>
        </div>
    );
}

// Previous value
function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}
```

---

## 8. useLayoutEffect

### Question
How to use useLayoutEffect for synchronous effects.

### Solution

```jsx
import { useLayoutEffect, useState, useRef } from 'react';

function Tooltip({ text }) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const tooltipRef = useRef(null);
    
    // Runs synchronously before paint
    useLayoutEffect(() => {
        if (tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            setPosition({
                x: rect.left,
                y: rect.top
            });
        }
    }, [text]);
    
    return (
        <div ref={tooltipRef} style={{ position: 'absolute', ...position }}>
            {text}
        </div>
    );
}
```

### useEffect vs useLayoutEffect

```
useEffect:
Render → Paint → Effect runs (async)

useLayoutEffect:
Render → Effect runs (sync) → Paint
```

---

## 9. useImperativeHandle

### Question
How to use useImperativeHandle to expose methods.

### Solution

```jsx
import { forwardRef, useImperativeHandle, useRef } from 'react';

const Input = forwardRef((props, ref) => {
    const inputRef = useRef(null);
    
    useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
        },
        getValue: () => {
            return inputRef.current?.value;
        },
        setValue: (value) => {
            if (inputRef.current) {
                inputRef.current.value = value;
            }
        }
    }));
    
    return <input ref={inputRef} {...props} />;
});

// Usage
function Parent() {
    const inputRef = useRef(null);
    
    const handleClick = () => {
        inputRef.current?.focus();
        console.log(inputRef.current?.getValue());
    };
    
    return (
        <div>
            <Input ref={inputRef} />
            <button onClick={handleClick}>Focus Input</button>
        </div>
    );
}
```

---

## 10. useDebugValue

### Question
How to use useDebugValue for custom hook debugging.

### Solution

```jsx
import { useState, useDebugValue } from 'react';

function useCounter(initialValue = 0) {
    const [count, setCount] = useState(initialValue);
    
    // Shows in React DevTools
    useDebugValue(count, count => `Count: ${count}`);
    
    return [count, setCount];
}

// Usage
function Component() {
    const [count, setCount] = useCounter(0);
    return <div>{count}</div>;
}
```

---

## 11. useTransition (New)

### Question
How to use useTransition for non-urgent updates.

### Solution

```jsx
import { useTransition, useState } from 'react';

function SearchResults({ query }) {
    const [isPending, startTransition] = useTransition();
    const [results, setResults] = useState([]);
    
    const handleSearch = (newQuery) => {
        startTransition(() => {
            // Non-urgent update
            setResults(expensiveSearch(newQuery));
        });
    };
    
    return (
        <div>
            {isPending && <div>Loading...</div>}
            {results.map(result => (
                <div key={result.id}>{result.name}</div>
            ))}
        </div>
    );
}
```

---

## 12. useDeferredValue (New)

### Question
How to use useDeferredValue to defer value updates.

### Solution

```jsx
import { useDeferredValue, useState, useMemo } from 'react';

function SearchResults({ query }) {
    const deferredQuery = useDeferredValue(query);
    
    // This will use deferred value
    const results = useMemo(() => {
        return expensiveSearch(deferredQuery);
    }, [deferredQuery]);
    
    return (
        <div>
            {results.map(result => (
                <div key={result.id}>{result.name}</div>
            ))}
        </div>
    );
}
```

---

## 13. useId (New)

### Question
How to use useId for unique IDs.

### Solution

```jsx
import { useId } from 'react';

function Form() {
    const emailId = useId();
    const passwordId = useId();
    
    return (
        <form>
            <label htmlFor={emailId}>Email</label>
            <input id={emailId} type="email" />
            
            <label htmlFor={passwordId}>Password</label>
            <input id={passwordId} type="password" />
        </form>
    );
}
```

---

## 14. useSyncExternalStore (New)

### Question
How to use useSyncExternalStore for external stores.

### Solution

```jsx
import { useSyncExternalStore } from 'react';

function useStore(store) {
    return useSyncExternalStore(
        store.subscribe,
        store.getSnapshot
    );
}

// Usage
const store = {
    value: 0,
    listeners: new Set(),
    subscribe: (listener) => {
        store.listeners.add(listener);
        return () => store.listeners.delete(listener);
    },
    getSnapshot: () => store.value,
    increment: () => {
        store.value++;
        store.listeners.forEach(listener => listener());
    }
};

function Component() {
    const value = useStore(store);
    return <div>{value}</div>;
}
```

---

## 15. useInsertionEffect (New)

### Question
How to use useInsertionEffect for CSS-in-JS.

### Solution

```jsx
import { useInsertionEffect } from 'react';

function useCSS(rule) {
    useInsertionEffect(() => {
        const style = document.createElement('style');
        style.textContent = rule;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    });
}

// Usage
function Component() {
    useCSS(`
        .my-class {
            color: red;
        }
    `);
    
    return <div className="my-class">Styled</div>;
}
```

---

## Hook Comparison Table

| Hook | Purpose | When to Use |
|------|---------|-------------|
| useState | State management | Local component state |
| useEffect | Side effects | API calls, subscriptions |
| useContext | Global state | Theme, auth, settings |
| useReducer | Complex state | Forms, state machines |
| useMemo | Memoize values | Expensive calculations |
| useCallback | Memoize functions | Pass to child components |
| useRef | DOM/mutable refs | Focus, timers, previous values |
| useLayoutEffect | Sync effects | DOM measurements |
| useTransition | Non-urgent updates | Search, filtering |
| useDeferredValue | Defer updates | Large lists |
| useId | Unique IDs | Form labels, aria |

---

## Best Practices

- ✅ Use useEffect for side effects
- ✅ Use useMemo/useCallback wisely
- ✅ Clean up effects properly
- ✅ Use useTransition for better UX
- ✅ Prefer useId over Math.random()
- ✅ Use useLayoutEffect sparingly

