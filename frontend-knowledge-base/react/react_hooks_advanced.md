# React Hooks Advanced: Deep Dive   --- IMP

Comprehensive guide for advanced React hooks patterns, including performance optimization, DOM management, and React 18+ features.

---

## 1. Context
### **useContext**
Consumes a value from a React Context without the need for a Consumer component.
```jsx
const UserContext = createContext();

function Profile() {
  const user = useContext(UserContext);
  return <div>{user.name}</div>;
}
```

---

## 2. Refs / DOM
### **useRef**
Persists a mutable value across renders without triggering a re-render. Primarily used for direct DOM access.
```jsx
const inputRef = useRef(null);
const focusInput = () => inputRef.current.focus();
```

### **useImperativeHandle**
Customizes the instance value that is exposed to parent components when using `ref`. Must be used with `forwardRef`.
```jsx
useImperativeHandle(ref, () => ({
  focus: () => inputRef.current.focus()
}));
```

### **useLayoutEffect**
Fires synchronously **after all DOM mutations** but before the browser paints. Use it only for measuring DOM (e.g., tooltip positioning).
> [!WARNING]
> This can hurt performance. Use `useEffect` unless you need a synchronous DOM measurement.

### **useInsertionEffect**
Fires **before layout effects** and before the browser paints. Primarily for CSS-in-JS libraries to inject `<style>` tags.

---

## 3. State / Logic
### **useReducer**
An alternative to `useState` for complex state logic or state transitions (Redux-style).
```jsx
const [state, dispatch] = useReducer(reducer, initialState);
```

### **useActionState** (React 18+/19)
Handles form actions, processing state, and error handling in a single hook.
```jsx
const [error, submitAction, isPending] = useActionState(async (formData) => {
  return await saveToDb(formData);
}, null);
```

---

## 4. Performance
### **useMemo**
Memoizes the **result of a calculation** between re-renders.
```jsx
const cachedValue = useMemo(() => expensiveFunction(a, b), [a, b]);
```

### **useCallback**
Memoizes a **function definition** itself between re-renders. Use to prevent unnecessary child re-renders or in dependency arrays.
```jsx
const handleSearch = useCallback((query) => {
  fetchResults(query);
}, [fetchResults]);
```

### **useTransition**
Marks state updates as "transitions," allowing React to keep the UI responsive during expensive updates.
```jsx
const [isPending, startTransition] = useTransition();
const updateList = () => {
  startTransition(() => {
    setFilter(newFilter); // Low priority update
  });
};
```

### **useDeferredValue**
Defers updating a value that isn't urgent (e.g., a search results list) to keep the input field responsive.
```jsx
const deferredValue = useDeferredValue(inputValue);
```

---

## 5. React 18+ / Infra
### **useId**
Generates unique, stable IDs that work across server-side and client-side rendering. Essential for accessibility.
```jsx
const id = useId();
<label htmlFor={id}>Email</label>
<input id={id} type="email" />
```

### **useSyncExternalStore**
Subscribes to an external store (e.g., browser APIs like `navigator.onLine` or global state like Redux) while ensuring hydration safety.
```jsx
const isOnline = useSyncExternalStore(subscribe, getSnapshot);
```

---

## Summary Checklist
- [x] **Context**: `useContext`
- [x] **Refs / DOM**: `useRef`, `useImperativeHandle`, `useLayoutEffect`, `useInsertionEffect`
- [x] **State / Logic**: `useReducer`, `useActionState`
- [x] **Performance**: `useMemo`, `useCallback`, `useTransition`, `useDeferredValue`
- [x] **Infra**: `useId`, `useSyncExternalStore`

> [!TIP]
> Always use `useMemo` and `useCallback` judiciously; over-memoization can occasionally be more expensive than regular re-renders due to dependency checking overhead.

---

**Next Steps:**
- Learn [React Performance](react_performance.md) for deeper optimization strategies.
- Study [Custom Hooks](react_custom_hooks.md) for logic reuse.
