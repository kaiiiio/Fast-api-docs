# React Lifecycle and Memoization: Complete Guide

Complete guide to React lifecycle and optimization techniques.

## 1. React Lifecycle (Class Components)

### Question
What is the React component lifecycle?

### Solution

```jsx
class LifecycleComponent extends React.Component {
    // 1. Mounting Phase
    constructor(props) {
        super(props);
        this.state = { count: 0 };
        // Initialize state, bind methods
    }
    
    static getDerivedStateFromProps(props, state) {
        // Called before render
        // Return new state or null
        return null;
    }
    
    componentDidMount() {
        // Component mounted to DOM
        // Good for API calls, subscriptions
        console.log('Component mounted');
    }
    
    // 2. Updating Phase
    static getDerivedStateFromProps(props, state) {
        // Called on every update
        return null;
    }
    
    shouldComponentUpdate(nextProps, nextState) {
        // Return false to prevent re-render
        return nextProps.value !== this.props.value;
    }
    
    getSnapshotBeforeUpdate(prevProps, prevState) {
        // Called before DOM update
        // Return value passed to componentDidUpdate
        return { scrollPosition: window.scrollY };
    }
    
    componentDidUpdate(prevProps, prevState, snapshot) {
        // Component updated
        // Good for DOM updates, API calls
        console.log('Component updated', snapshot);
    }
    
    // 3. Unmounting Phase
    componentWillUnmount() {
        // Component about to unmount
        // Cleanup: remove listeners, cancel requests
        console.log('Component unmounting');
    }
    
    render() {
        return <div>{this.state.count}</div>;
    }
}
```

### Lifecycle Flow

```
MOUNTING:
constructor
    ↓
getDerivedStateFromProps
    ↓
render
    ↓
componentDidMount

UPDATING:
getDerivedStateFromProps
    ↓
shouldComponentUpdate (return false to stop)
    ↓
render
    ↓
getSnapshotBeforeUpdate
    ↓
componentDidUpdate

UNMOUNTING:
componentWillUnmount
```

---

## 2. React Lifecycle (Functional Components)

### Question
How to replicate lifecycle in functional components?

### Solution

```jsx
import { useEffect, useState } from 'react';

function FunctionalLifecycle({ value }) {
    const [count, setCount] = useState(0);
    
    // componentDidMount equivalent
    useEffect(() => {
        console.log('Component mounted');
        // Cleanup = componentWillUnmount
        return () => {
            console.log('Component unmounting');
        };
    }, []); // Empty deps = run once
    
    // componentDidUpdate equivalent
    useEffect(() => {
        console.log('Value changed:', value);
    }, [value]); // Run when value changes
    
    // componentDidMount + componentDidUpdate
    useEffect(() => {
        console.log('Component mounted or updated');
    }); // No deps = run on every render
    
    return <div>{count}</div>;
}
```

### Lifecycle Mapping

```
Class Component          →  Functional Component
─────────────────────────────────────────────────
constructor              →  useState
componentDidMount        →  useEffect(..., [])
componentDidUpdate       →  useEffect(..., [deps])
componentWillUnmount     →  useEffect cleanup
shouldComponentUpdate    →  React.memo
getDerivedStateFromProps →  useState + useEffect
```

---

## 3. React.memo

### Question
How to use React.memo to prevent unnecessary re-renders?

### Solution

```jsx
import { memo } from 'react';

// Basic memo
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
    console.log('Rendering expensive component');
    return <div>{data}</div>;
});

// Custom comparison
const CustomMemoComponent = memo(
    function CustomMemoComponent({ user }) {
        return <div>{user.name}</div>;
    },
    (prevProps, nextProps) => {
        // Return true if props are equal (skip render)
        // Return false if props are different (render)
        return prevProps.user.id === nextProps.user.id;
    }
);

// Usage
function Parent() {
    const [count, setCount] = useState(0);
    const [user, setUser] = useState({ id: 1, name: 'John' });
    
    return (
        <div>
            <button onClick={() => setCount(count + 1)}>
                Count: {count}
            </button>
            {/* This won't re-render when count changes */}
            <ExpensiveComponent data="static" />
            <CustomMemoComponent user={user} />
        </div>
    );
}
```

### Memo Visual

```
WITHOUT MEMO:
Parent re-renders
       │
       ├─→ Child re-renders (unnecessary)
       └─→ Child re-renders (unnecessary)

WITH MEMO:
Parent re-renders
       │
       ├─→ Child checks props
       │   ├─→ Props same → Skip render ✅
       │   └─→ Props different → Render
       └─→ Child checks props
           ├─→ Props same → Skip render ✅
           └─→ Props different → Render
```

---

## 4. useMemo Deep Dive

### Question
When and how to use useMemo effectively?

### Solution

```jsx
import { useMemo, useState } from 'react';

// Expensive calculation
function ExpensiveCalculation({ items, filter }) {
    // Only recalculates when items or filter change
    const filteredItems = useMemo(() => {
        console.log('Filtering...');
        return items.filter(item => {
            // Expensive operation
            return item.category === filter;
        });
    }, [items, filter]);
    
    return (
        <div>
            {filteredItems.map(item => (
                <div key={item.id}>{item.name}</div>
            ))}
        </div>
    );
}

// Memoized object (prevents child re-render)
function Parent() {
    const [count, setCount] = useState(0);
    const user = useMemo(() => ({
        name: 'John',
        age: 30
    }), []); // Same object reference
    
    return (
        <div>
            <button onClick={() => setCount(count + 1)}>
                {count}
            </button>
            {/* Child won't re-render when count changes */}
            <Child user={user} />
        </div>
    );
}

// Memoized array
function List({ items }) {
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);
    
    return (
        <ul>
            {sortedItems.map(item => (
                <li key={item.id}>{item.name}</li>
            ))}
        </ul>
    );
}
```

### useMemo Flow

```
Component renders
       │
       ▼
Check dependencies
       │
       ├─→ Dependencies changed?
       │   ├─→ Yes → Recalculate
       │   └─→ No → Return cached value
       │
       ▼
Use memoized value
```

---

## 5. useCallback Deep Dive

### Question
When and how to use useCallback effectively?

### Solution

```jsx
import { useCallback, useState, memo } from 'react';

// Without useCallback (recreated every render)
function ParentWithoutCallback() {
    const [count, setCount] = useState(0);
    
    const handleClick = () => {
        console.log('Clicked');
    };
    
    // handleClick is new function every render
    return <Child onClick={handleClick} />;
}

// With useCallback (memoized function)
function ParentWithCallback() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    
    // Function only recreated when count changes
    const handleClick = useCallback(() => {
        console.log('Clicked', count);
    }, [count]);
    
    return (
        <div>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            {/* Child won't re-render when name changes */}
            <MemoizedChild onClick={handleClick} />
        </div>
    );
}

const MemoizedChild = memo(function Child({ onClick }) {
    console.log('Child rendered');
    return <button onClick={onClick}>Click me</button>;
});

// useCallback with dependencies
function Search({ onSearch }) {
    const [query, setQuery] = useState('');
    
    const handleSearch = useCallback(() => {
        onSearch(query);
    }, [query, onSearch]);
    
    return (
        <div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
            <button onClick={handleSearch}>Search</button>
        </div>
    );
}
```

### useCallback Flow

```
Component renders
       │
       ▼
Check dependencies
       │
       ├─→ Dependencies changed?
       │   ├─→ Yes → Create new function
       │   └─→ No → Return cached function
       │
       ▼
Pass function to child
       │
       ▼
Child checks if function changed
       │
       ├─→ Same reference → Skip render ✅
       └─→ Different reference → Render
```

---

## 6. When to Use Memoization

### Question
When should you use memo, useMemo, and useCallback?

### Solution

```jsx
// ✅ USE useMemo for:
// 1. Expensive calculations
const expensiveValue = useMemo(() => {
    return heavyComputation(data);
}, [data]);

// 2. Creating objects/arrays passed as props
const config = useMemo(() => ({
    theme: 'dark',
    locale: 'en'
}), []);

// ❌ DON'T use useMemo for:
// 1. Simple calculations
const sum = a + b; // Just calculate directly

// 2. Primitives
const count = items.length; // No need to memoize

// ✅ USE useCallback for:
// 1. Functions passed to memoized children
const handleClick = useCallback(() => {
    // ...
}, [deps]);

// 2. Functions in dependency arrays
useEffect(() => {
    // ...
}, [handleClick]); // handleClick should be memoized

// ❌ DON'T use useCallback for:
// 1. Functions only used in event handlers
<button onClick={() => console.log('click')} /> // No need

// ✅ USE React.memo for:
// 1. Expensive components
const ExpensiveComponent = memo(Component);

// 2. Components that re-render often with same props
const ListItem = memo(Item);

// ❌ DON'T use React.memo for:
// 1. Components that always receive new props
// 2. Simple components (overhead not worth it)
```

---

## 7. Performance Optimization Patterns

### Question
Complete optimization patterns for React.

### Solution

```jsx
// Pattern 1: Memoize expensive children
function Parent() {
    const [count, setCount] = useState(0);
    const expensiveData = useMemo(() => computeExpensive(), []);
    
    return (
        <div>
            <button onClick={() => setCount(count + 1)}>{count}</button>
            <MemoizedChild data={expensiveData} />
        </div>
    );
}

// Pattern 2: Combine memo + useCallback
const MemoizedChild = memo(function Child({ onClick, data }) {
    return <button onClick={onClick}>{data}</button>;
});

function Parent() {
    const handleClick = useCallback(() => {
        // ...
    }, []);
    
    return <MemoizedChild onClick={handleClick} data="test" />;
}

// Pattern 3: Split components
function OptimizedList({ items }) {
    return (
        <div>
            {items.map(item => (
                <MemoizedItem key={item.id} item={item} />
            ))}
        </div>
    );
}

const MemoizedItem = memo(function Item({ item }) {
    return <div>{item.name}</div>;
});
```

---

## Key Concepts

1. **Lifecycle**: Mounting, Updating, Unmounting
2. **React.memo**: Prevent re-renders with same props
3. **useMemo**: Memoize expensive calculations
4. **useCallback**: Memoize functions
5. **When to Use**: Performance optimization guidelines
6. **Patterns**: Common optimization patterns

## Best Practices

- ✅ Use memoization only when needed
- ✅ Profile before optimizing
- ✅ Memoize expensive calculations
- ✅ Memoize functions passed to memoized children
- ✅ Don't over-optimize
- ✅ Measure performance impact

