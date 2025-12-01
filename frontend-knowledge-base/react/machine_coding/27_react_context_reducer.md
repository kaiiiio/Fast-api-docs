# React Context and Reducer: Complete Guide

Complete guide to React Context API and useReducer with patterns.

## 1. React Context Basics

### Question
How to create and use React Context?

### Solution

```jsx
import { createContext, useContext, useState } from 'react';

// Step 1: Create context
const ThemeContext = createContext();

// Step 2: Create provider
function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    
    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };
    
    const value = {
        theme,
        toggleTheme,
        isDark: theme === 'dark'
    };
    
    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// Step 3: Create custom hook
function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

// Step 4: Use in components
function ThemedButton() {
    const { theme, toggleTheme } = useTheme();
    
    return (
        <button
            onClick={toggleTheme}
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

### Context Flow

```
Provider
    │
    ├─→ Context value
    │
    ▼
Consumer Components
    │
    ├─→ Component 1 (uses context)
    ├─→ Component 2 (uses context)
    └─→ Component 3 (uses context)
```

---

## 2. Multiple Contexts

### Question
How to use multiple contexts?

### Solution

```jsx
// Theme Context
const ThemeContext = createContext();
const AuthContext = createContext();
const LanguageContext = createContext();

function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

function LanguageProvider({ children }) {
    const [language, setLanguage] = useState('en');
    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

// Usage
function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <LanguageProvider>
                    <Component />
                </LanguageProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

// Component using multiple contexts
function Component() {
    const { theme } = useContext(ThemeContext);
    const { user } = useContext(AuthContext);
    const { language } = useContext(LanguageContext);
    
    return <div>Theme: {theme}, User: {user?.name}, Lang: {language}</div>;
}
```

---

## 3. Context with useReducer

### Question
How to combine Context with useReducer?

### Solution

```jsx
import { createContext, useContext, useReducer } from 'react';

// Reducer
function todoReducer(state, action) {
    switch (action.type) {
        case 'ADD_TODO':
            return {
                ...state,
                todos: [...state.todos, {
                    id: Date.now(),
                    text: action.payload,
                    completed: false
                }]
            };
        case 'TOGGLE_TODO':
            return {
                ...state,
                todos: state.todos.map(todo =>
                    todo.id === action.payload
                        ? { ...todo, completed: !todo.completed }
                        : todo
                )
            };
        case 'DELETE_TODO':
            return {
                ...state,
                todos: state.todos.filter(todo => todo.id !== action.payload)
            };
        default:
            return state;
    }
}

// Context
const TodoContext = createContext();

// Provider
function TodoProvider({ children }) {
    const [state, dispatch] = useReducer(todoReducer, {
        todos: []
    });
    
    const addTodo = (text) => {
        dispatch({ type: 'ADD_TODO', payload: text });
    };
    
    const toggleTodo = (id) => {
        dispatch({ type: 'TOGGLE_TODO', payload: id });
    };
    
    const deleteTodo = (id) => {
        dispatch({ type: 'DELETE_TODO', payload: id });
    };
    
    const value = {
        todos: state.todos,
        addTodo,
        toggleTodo,
        deleteTodo
    };
    
    return (
        <TodoContext.Provider value={value}>
            {children}
        </TodoContext.Provider>
    );
}

// Hook
function useTodos() {
    const context = useContext(TodoContext);
    if (!context) {
        throw new Error('useTodos must be used within TodoProvider');
    }
    return context;
}

// Usage
function TodoList() {
    const { todos, toggleTodo, deleteTodo } = useTodos();
    
    return (
        <ul>
            {todos.map(todo => (
                <li key={todo.id}>
                    <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                    />
                    {todo.text}
                    <button onClick={() => deleteTodo(todo.id)}>Delete</button>
                </li>
            ))}
        </ul>
    );
}
```

---

## 4. useReducer Patterns

### Question
Advanced useReducer patterns and best practices.

### Solution

```jsx
// Pattern 1: Action creators
function createActions(dispatch) {
    return {
        increment: () => dispatch({ type: 'INCREMENT' }),
        decrement: () => dispatch({ type: 'DECREMENT' }),
        reset: () => dispatch({ type: 'RESET' }),
        setValue: (value) => dispatch({ type: 'SET_VALUE', payload: value })
    };
}

// Pattern 2: Async actions
function useAsyncReducer(reducer, initialState) {
    const [state, dispatch] = useReducer(reducer, initialState);
    
    const asyncDispatch = useCallback(async (action) => {
        if (typeof action === 'function') {
            return await action(dispatch, () => state);
        }
        return dispatch(action);
    }, [state]);
    
    return [state, asyncDispatch];
}

// Usage
const fetchUser = (id) => async (dispatch, getState) => {
    dispatch({ type: 'FETCH_USER_START' });
    try {
        const user = await api.getUser(id);
        dispatch({ type: 'FETCH_USER_SUCCESS', payload: user });
    } catch (error) {
        dispatch({ type: 'FETCH_USER_ERROR', payload: error });
    }
};

// Pattern 3: Reducer composition
function combineReducers(reducers) {
    return (state = {}, action) => {
        const newState = {};
        for (const key in reducers) {
            newState[key] = reducers[key](state[key], action);
        }
        return newState;
    };
}

// Pattern 4: Middleware
function useReducerWithMiddleware(reducer, initialState, middleware) {
    const [state, dispatch] = useReducer(reducer, initialState);
    
    const dispatchWithMiddleware = useCallback((action) => {
        middleware(action, dispatch, state);
    }, [state]);
    
    return [state, dispatchWithMiddleware];
}
```

---

## 5. Context Performance Optimization

### Question
How to optimize Context performance?

### Solution

```jsx
// Problem: Context value object recreated every render
function BadProvider({ children }) {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    
    // ❌ New object every render
    return (
        <Context.Provider value={{ count, setCount, name, setName }}>
            {children}
        </Context.Provider>
    );
}

// Solution 1: Memoize value
function GoodProvider({ children }) {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    
    // ✅ Memoized value
    const value = useMemo(() => ({
        count,
        setCount,
        name,
        setName
    }), [count, name]);
    
    return (
        <Context.Provider value={value}>
            {children}
        </Context.Provider>
    );
}

// Solution 2: Split contexts
const CountContext = createContext();
const NameContext = createContext();

function SplitProvider({ children }) {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    
    return (
        <CountContext.Provider value={{ count, setCount }}>
            <NameContext.Provider value={{ name, setName }}>
                {children}
            </NameContext.Provider>
        </CountContext.Provider>
    );
}

// Solution 3: Context selector pattern
function useContextSelector(context, selector) {
    const value = useContext(context);
    return useMemo(() => selector(value), [value, selector]);
}

// Usage
function Component() {
    // Only re-renders when count changes, not name
    const count = useContextSelector(MyContext, state => state.count);
    return <div>{count}</div>;
}
```

---

## 6. Context vs Redux Pattern

### Question
When to use Context vs useReducer vs Redux?

### Solution

```jsx
// ✅ Use Context + useState for:
// - Simple global state (theme, language)
// - Small apps
// - State that doesn't change often

// ✅ Use Context + useReducer for:
// - Complex state logic
// - Multiple related state updates
// - State machines

// ✅ Use Redux for:
// - Large applications
// - Complex state management
// - Time-travel debugging
// - Middleware needs

// Example: Context + useReducer (Redux-like)
function createStore(reducer, initialState) {
    const StoreContext = createContext();
    
    function StoreProvider({ children }) {
        const [state, dispatch] = useReducer(reducer, initialState);
        
        const value = useMemo(() => ({
            state,
            dispatch,
            getState: () => state
        }), [state]);
        
        return (
            <StoreContext.Provider value={value}>
                {children}
            </StoreContext.Provider>
        );
    }
    
    function useStore() {
        const context = useContext(StoreContext);
        if (!context) {
            throw new Error('useStore must be used within StoreProvider');
        }
        return context;
    }
    
    return { StoreProvider, useStore };
}
```

---

## 7. Advanced Context Patterns

### Question
Advanced patterns with Context.

### Solution

```jsx
// Pattern 1: Context with default values
const MyContext = createContext({
    value: 'default',
    updateValue: () => {}
});

// Pattern 2: Context factory
function createContextWithHook(defaultValue) {
    const Context = createContext(defaultValue);
    
    const Provider = ({ value, children }) => {
        return (
            <Context.Provider value={value}>
                {children}
            </Context.Provider>
        );
    };
    
    const useCustomContext = () => {
        const context = useContext(Context);
        if (context === defaultValue) {
            throw new Error('Must be used within Provider');
        }
        return context;
    };
    
    return { Provider, useCustomContext };
}

// Pattern 3: Nested providers
function AppProvider({ children }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <LanguageProvider>
                    {children}
                </LanguageProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
```

---

## Key Concepts

1. **Context API**: createContext, Provider, useContext
2. **useReducer**: Complex state management
3. **Combining**: Context + useReducer pattern
4. **Performance**: Memoization, splitting contexts
5. **Patterns**: Action creators, async actions
6. **Optimization**: Context selector, splitting

## Best Practices

- ✅ Create custom hooks for context
- ✅ Memoize context values
- ✅ Split contexts by concern
- ✅ Use useReducer for complex state
- ✅ Provide error handling
- ✅ Document context structure

