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
```

### Oral Explanation (Interview Ready)

> "**`useState`** is the most fundamental hook for state management in React. It is used when we want a component to 're-render' whenever a variable's value changes."

1.  **State vs. Variable**: Updating a regular variable won't trigger a UI update. However, calling the `useState` setter function (e.g., `setCount`) informs React that the state has changed and the UI needs to be re-rendered.
2.  **Asynchronous Nature**: `setState` updates are asynchronous. If you need to update state based on its previous value several times within the same function, you should use the 'functional update' pattern (`prev => prev + 1`).
3.  **Initial Value & Immutable Updates**: You can store primitives (numbers, strings) or complex types (objects, arrays). For objects and arrays, always use the 'spread operator' (`{...prev}`) to create a new reference, otherwise, React may fail to detect the change and skip the re-render.

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
```

### Oral Explanation (Interview Ready)

> "**`useEffect`** is used for handling side-effects. Whenever you need to perform an action after the component renders (such as API calls, subscriptions, or direct DOM manipulation), this hook is the standard approach."

1.  **Dependency Array**: 
    *   **No array**: Runs on every render.
    *   **Empty array `[]`**: Runs only once after the initial mount.
    *   **`[data]`**: Runs whenever the `data` dependency changes.
2.  **Cleanup Function**: To prevent memory leaks, we can return a cleanup function. This function runs before the next effect execution and when the component unmounts, making it ideal for clearing timers or removing event listeners.
3.  **Timing**: It runs **AFTER** the browser has finished painting, ensuring that your logic doesn't block the UI rendering (Non-blocking).

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
```

### Oral Explanation (Interview Ready)

> "**`useContext`** is used to avoid 'Prop Drilling' by sharing state globally across the component tree. It allows deep-level components to consume data directly from a provider."

1.  **State Management**: It is ideal for managing global settings like Themes, Authentication, or User Preferences in small-to-medium applications.
2.  **The Problem it Solves**: If you have a component nested 5 layers deep, you don't need to manually pass props through every intermediate component just to get the data to its destination.
3.  **Performance Considerations**: When the context's 'value' changes, all components consuming that context will re-render. To optimize this, it's best to split contexts by their specific domains (e.g., separate `AuthContext` and `ThemeContext`).

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

function counterReducer(state, action) {
    switch (action.type) {
        case 'increment': return { count: state.count + 1 };
        case 'decrement': return { count: state.count - 1 };
        default: return state;
    }
}

function Counter() {
    const [state, dispatch] = useReducer(counterReducer, { count: 0 });
    return <button onClick={() => dispatch({ type: 'increment' })}>{state.count}</button>;
}
```

### Oral Explanation (Interview Ready)

> "**`useReducer`** is an advanced alternative to `useState`. It is typically used when the state logic is complex, involving multiple sub-values or dependencies."

1.  **Redux-like Pattern**: It follows a pattern similar to Redux—using a `reducer` function to handle state transitions and a `dispatch` function to trigger specific actions.
2.  **Predictability**: It makes state updates more predictable by consolidating all state logic into a single dedicated function outside the component.
3.  **Use Cases**: If you have a form with many fields where one field's value depends on another, `useState` can quickly become difficult to manage. In such scenarios, `useReducer` is the cleaner solution.

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
    const filteredItems = useMemo(() => {
        return items.filter(item => item.category === filter);
    }, [items, filter]);
    
    return <div>{filteredItems.length} items</div>;
}
```

### Oral Explanation (Interview Ready)

> "**`useMemo`** is used to cache (memoize) the result of an expensive calculation. This prevents the logic from re-running unnecessarily on every render unless its dependencies change."

1.  **Return Value**: It returns a memoized value, such as a filtered array or a complex object.
2.  **Referential Integrity**: It is often used to maintain the same object reference across renders. If you create a new object on every render, child components might re-render unnecessarily. `useMemo` returns the previous reference as long as dependencies are the same.
3.  **When to use**: Use it judiciously! It's most effective for truly heavy operations (like sorting or filtering thousands of items) or when referential equality is required for performance optimization in children.

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
```

### Oral Explanation (Interview Ready)

> "**`useCallback`** is used to memoize a function definition. It returns the same function reference across renders unless its dependencies change."

1.  **Main Purpose**: When you pass a function to a child component, a new function reference is created in the Parent on every render. If the child is wrapped in `React.memo`, it will still re-render because the function reference has changed. `useCallback` prevents this by returning the cached function reference.
2.  **`useMemo` vs. `useCallback`**: While similar, `useMemo` caches the **return value** of a function, whereas `useCallback` caches the **function itself**.
3.  **Optimization Tip**: This hook is only truly effective when the child component receiving the function is optimized using `React.memo`.
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
```

### Oral Explanation (Interview Ready)

> "**`useRef`** acts as a container that holds a mutable value for the entire lifecycle of a component. Most importantly, updating a ref's value does **NOT** trigger a re-render."

1.  **DOM Access**: The most common use case is interacting directly with the DOM (e.g., focusing an input or measuring scroll position).
2.  **Mutable Values**: If you need to store a value that persists between renders (like a `timerId` or the `previousValue` of a prop) but don't want to cause the UI to update when it changes, `useRef` is your best choice.
3.  **Ref Object**: It returns an object with a single property: `{ current: value }`. You always read or update the value via `.current`.
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
How to use `useLayoutEffect` for synchronous effects and why it is used instead of `useEffect` in specific scenarios?

### Solution

```jsx
import { useLayoutEffect, useState, useRef } from 'react';

function Tooltip({ text }) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const tooltipRef = useRef(null);
    
    /**
     * useLayoutEffect runs SYNCHRONOUSLY after all DOM mutations
     * but BEFORE the browser has a chance to paint those changes to the screen.
     */
    useLayoutEffect(() => {
        if (tooltipRef.current) {
            // Measure the DOM element's real dimensions/position
            const rect = tooltipRef.current.getBoundingClientRect();
            
            // Re-render occurs immediately before paint
            setPosition({
                x: rect.left,
                y: rect.top
            });
        }
    }, [text]); // Re-measure if text changes
    
    return (
        <div ref={tooltipRef} style={{ position: 'absolute', left: position.x, top: position.y }}>
            {text}
        </div>
    );
}
```

### Oral Explanation (Interview Ready)

> "**`useLayoutEffect`** is used when you need to perform DOM measurements or updates that are immediately visible to the user, ensuring there is no visual 'flicker'."

1.  **Synchronous Execution**: Unlike `useEffect`, this hook runs synchronously **after** DOM mutations but **before** the browser paints the screen.
2.  **Avoiding Flickering**: If you update an element's position in `useEffect`, the user might see it in its original position for a split second before it jumps (Flicker). `useLayoutEffect` prevents this by applying measurements and updates before the paint.
3.  **Performance Trade-off**: You should use this sparingly as it blocks the browser's painting process until the logic is finished.

### Key Comparison

| Phase | `useEffect` | `useLayoutEffect` |
|-------|-------------|-------------------|
| **Timing** | Asynchronous (After Paint) | Synchronous (Before Paint) |
| **Visuals** | Can cause flickering | Prevents visual flickering |
| **Use Case** | Data fetching, Subscriptions | DOM Measurements, Animations |
| **Blocking** | Non-blocking (Smooth UI) | Blocking (Can delay paint) |

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
        focus: () => { inputRef.current?.focus(); },
        getValue: () => inputRef.current?.value
    }));
    return <input ref={inputRef} {...props} />;
});
```

### Oral Explanation (Interview Ready)

> "**`useImperativeHandle`** is used to customize the instance value that is exposed to a parent component through a `ref`. It allows you to expose specific methods or values without revealing the entire DOM element."

1.  **Custom API**: It enables the child component to provide a clean API (e.g., `focus()`, `reset()`, `validate()`) to its parent.
2.  **`forwardRef` Dependency**: It must always be used in conjunction with `forwardRef` to receive the ref from the parent.
3.  **Encapsulation**: It helps maintain encapsulation by ensuring the parent only interacts with the methods you explicitly choose to expose.

---

## 10. useDebugValue

### Question
How to use useDebugValue for custom hook debugging.

### Solution

```jsx
import { useState, useDebugValue } from 'react';

function useCounter(initialValue = 0) {
    const [count, setCount] = useState(initialValue);
    useDebugValue(count, count => `Count: ${count}`);
    return [count, setCount];
}
```

### Oral Explanation (Interview Ready)

> "**`useDebugValue`** is specifically used to display custom labels for custom hooks in the React Developer Tools. It has no impact on production performance or application logic."

1.  **Developer Experience**: When using many custom hooks, it helps identify them in DevTools with labels like "Status: Online".
2.  **Deferred Formatting**: It supports a second argument (a formatting function) that only runs when DevTools is open, minimizing performance overhead.

---

## 11. useTransition (New)

### Question
How to use useTransition for non-urgent updates.

### Solution

```jsx
import { useTransition, useState } from 'react';

function SearchComponent() {
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState("");

    const updateQuery = (e) => {
        startTransition(() => {
            setQuery(e.target.value); // Non-urgent update
        });
    };
    
    return <div>{isPending ? "Updating..." : query}</div>;
}
```

### Oral Explanation (Interview Ready)

> "**`useTransition`** is a React 18 feature that allows you to mark state updates as 'Urgent' or 'Non-Urgent'."

1.  **Urgent vs. Non-Urgent**: Updates like typing into an input are urgent, but rendering a massive list of search outcomes is non-urgent. `startTransition` informs React that it can delay certain updates to keep the main interaction (like typing) smooth.
2.  **`isPending` State**: It provides a boolean status indicating if a transition is currently being processed, allowing you to show a loading indicator in the UI.
3.  **Reduced UI Lag**: It ensures that heavy state updates don't block the UI and cause noticeable lag.

---

## 12. useDeferredValue (New)

### Question
How to use useDeferredValue to defer value updates.

### Solution

```jsx
import { useDeferredValue, useState } from 'react';

function SearchResults({ query }) {
    const deferredQuery = useDeferredValue(query);
    return <div>Displaying results for: {deferredQuery}</div>;
}
```

### Oral Explanation (Interview Ready)

> "**`useDeferredValue`** is similar to `useTransition`, but it is used to defer a 'value' (from props or state) rather than a specific update action."

1.  **Key Distinction**: While `useTransition` wraps the code that triggers the update, `useDeferredValue` accepts a value and returns a 'deferred' version that updates with a slight delay.
2.  **Use Case**: It is ideal when an input value is passed to a 'heavy' child component. By deferring the value, the child component updates only when the main thread is idle, preventing UI stutter.

---

## 13. useId (New)

### Question
How to use useId for unique IDs.

### Solution

```jsx
import { useId } from 'react';

function Form() {
    const id = useId();
    return (
        <>
            <label htmlFor={id}>Email</label>
            <input id={id} type="email" />
        </>
    );
}
```

### Oral Explanation (Interview Ready)

> "**`useId`** generates unique and consistent IDs that are stable across both client and server, preventing hydration mismatches."

1.  **Server-Side Rendering (SSR)**: Using `Math.random()` can cause a mismatch between server-generated and client-generated IDs. `useId` ensures the IDs are identical on both sides.
2.  **Accessibility (A11y)**: It simplifies linking labels to inputs and managing ARIA attributes by providing stable, predictable identifiers.

---

## 14. useSyncExternalStore (New)

### Question
How to use useSyncExternalStore for external stores.

### Solution

```jsx
import { useSyncExternalStore } from 'react';

function useOnlineStatus() {
    return useSyncExternalStore(
        (callback) => {
            window.addEventListener('online', callback);
            window.addEventListener('offline', callback);
            return () => {
                window.removeEventListener('online', callback);
                window.removeEventListener('offline', callback);
            };
        },
        () => navigator.onLine
    );
}
```

### Oral Explanation (Interview Ready)

> "**`useSyncExternalStore`** is an advanced React 18 hook used for subscribing to external data stores, such as Redux, Zustand, or native browser APIs."

1.  **Preventing Tearing**: In concurrent rendering, UI components might show inconsistent values if the external store updates during a render cycle. This hook ensures the entire UI remains synced with a single snapshot of the data.
2.  **Arguments**: It requires a `subscribe` function (to listen for changes) and a `getSnapshot` function (to retrieve the current value).
3.  **When to use**: Use this when building state management libraries or binding React to non-React sources like browser history or online/offline status.

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
        return () => document.head.removeChild(style);
    }, [rule]);
}
```

### Oral Explanation (Interview Ready)

> "**`useInsertionEffect`** is specifically designed for CSS-in-JS libraries (like styled-components or Emotion). It is not intended for typical application development."

1.  **Timing**: It runs before `useLayoutEffect`, allowing libraries to insert `<style>` tags into the document head before layout calculations occur.
2.  **Optimization**: By inserting styles early, it avoids the performance overhead of browsers having to recalculate layouts multiple times during a single render cycle.

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

