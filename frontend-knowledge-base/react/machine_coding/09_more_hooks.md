# More React Hooks: Advanced Custom Hooks

Additional custom React hooks implementations for machine coding interviews.

## 1. useArray Hook

### Question
Implement a hook that manages an array of items.

### Solution

```jsx
import { useState, useCallback } from 'react';

function useArray(initialValue = []) {
    const [array, setArray] = useState(initialValue);

    const push = useCallback((item) => {
        setArray(prev => [...prev, item]);
    }, []);

    const pop = useCallback(() => {
        setArray(prev => prev.slice(0, -1));
    }, []);

    const unshift = useCallback((item) => {
        setArray(prev => [item, ...prev]);
    }, []);

    const shift = useCallback(() => {
        setArray(prev => prev.slice(1));
    }, []);

    const remove = useCallback((index) => {
        setArray(prev => prev.filter((_, i) => i !== index));
    }, []);

    const update = useCallback((index, item) => {
        setArray(prev => prev.map((el, i) => i === index ? item : el));
    }, []);

    const clear = useCallback(() => {
        setArray([]);
    }, []);

    const reset = useCallback(() => {
        setArray(initialValue);
    }, [initialValue]);

    return {
        array,
        push,
        pop,
        unshift,
        shift,
        remove,
        update,
        clear,
        reset,
        length: array.length
    };
}

// Usage
function TodoList() {
    const { array: todos, push, remove, clear } = useArray([]);

    return (
        <div>
            <button onClick={() => push('New Todo')}>Add</button>
            <button onClick={clear}>Clear All</button>
            {todos.map((todo, index) => (
                <div key={index}>
                    {todo}
                    <button onClick={() => remove(index)}>Remove</button>
                </div>
            ))}
        </div>
    );
}
```

---

## 2. useSet Hook

### Question
Implement a hook that manages a JavaScript set.

### Solution

```jsx
import { useState, useCallback } from 'react';

function useSet(initialValue = []) {
    const [set, setSet] = useState(new Set(initialValue));

    const add = useCallback((value) => {
        setSet(prev => {
            const newSet = new Set(prev);
            newSet.add(value);
            return newSet;
        });
    }, []);

    const remove = useCallback((value) => {
        setSet(prev => {
            const newSet = new Set(prev);
            newSet.delete(value);
            return newSet;
        });
    }, []);

    const has = useCallback((value) => {
        return set.has(value);
    }, [set]);

    const clear = useCallback(() => {
        setSet(new Set());
    }, []);

    const toggle = useCallback((value) => {
        setSet(prev => {
            const newSet = new Set(prev);
            if (newSet.has(value)) {
                newSet.delete(value);
            } else {
                newSet.add(value);
            }
            return newSet;
        });
    }, []);

    return {
        set,
        add,
        remove,
        has,
        clear,
        toggle,
        size: set.size,
        values: Array.from(set)
    };
}

// Usage
function TagSelector() {
    const { values: tags, add, remove, toggle, has } = useSet();

    return (
        <div>
            {tags.map(tag => (
                <span key={tag} onClick={() => toggle(tag)}>
                    {tag}
                </span>
            ))}
        </div>
    );
}
```

---

## 3. useTimeout Hook

### Question
Implement a hook that invokes a callback function after a specified delay.

### Solution

```jsx
import { useEffect, useRef } from 'react';

function useTimeout(callback, delay) {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay !== null) {
            const id = setTimeout(() => {
                savedCallback.current();
            }, delay);

            return () => clearTimeout(id);
        }
    }, [delay]);
}

// Usage
function DelayedMessage() {
    const [message, setMessage] = useState('');

    useTimeout(() => {
        setMessage('This message appeared after 2 seconds!');
    }, 2000);

    return <div>{message}</div>;
}
```

---

## 4. useMediaQuery Hook

### Question
Implement a hook that subscribes and responds to media query changes.

### Solution

```jsx
import { useState, useEffect } from 'react';

function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);
        
        const handleChange = (event) => {
            setMatches(event.matches);
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [query]);

    return matches;
}

// Usage
function ResponsiveComponent() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
    const isDesktop = useMediaQuery('(min-width: 1025px)');

    return (
        <div>
            {isMobile && <p>Mobile View</p>}
            {isTablet && <p>Tablet View</p>}
            {isDesktop && <p>Desktop View</p>}
        </div>
    );
}
```

---

## 5. useHover Hook

### Question
Implement a hook that tracks whether an element is being hovered.

### Solution

```jsx
import { useState, useRef, useEffect } from 'react';

function useHover() {
    const [isHovered, setIsHovered] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleMouseEnter = () => setIsHovered(true);
        const handleMouseLeave = () => setIsHovered(false);

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return [ref, isHovered];
}

// Usage
function HoverableButton() {
    const [ref, isHovered] = useHover();

    return (
        <button ref={ref} className={isHovered ? 'hovered' : ''}>
            {isHovered ? 'Hovering!' : 'Hover me'}
        </button>
    );
}
```

---

## 6. useKeyPress Hook

### Question
Implement a hook that subscribes to keyboard events.

### Solution

```jsx
import { useState, useEffect } from 'react';

function useKeyPress(targetKey) {
    const [keyPressed, setKeyPressed] = useState(false);

    useEffect(() => {
        const downHandler = ({ key }) => {
            if (key === targetKey) {
                setKeyPressed(true);
            }
        };

        const upHandler = ({ key }) => {
            if (key === targetKey) {
                setKeyPressed(false);
            }
        };

        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);

        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, [targetKey]);

    return keyPressed;
}

// Usage
function KeyboardShortcuts() {
    const enterPressed = useKeyPress('Enter');
    const escapePressed = useKeyPress('Escape');

    useEffect(() => {
        if (enterPressed) {
            console.log('Enter pressed!');
        }
    }, [enterPressed]);

    return <div>Press Enter or Escape</div>;
}
```

---

## 7. useClickAnywhere Hook

### Question
Implement a hook that handles click events anywhere on the document.

### Solution

```jsx
import { useEffect } from 'react';

function useClickAnywhere(handler) {
    useEffect(() => {
        const handleClick = (event) => {
            handler(event);
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('touchstart', handleClick);

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [handler]);
}

// Usage
function App() {
    useClickAnywhere((event) => {
        console.log('Clicked:', event.target);
    });

    return <div>Click anywhere</div>;
}
```

---

## 8. useCycle Hook

### Question
Implement a hook that cycles through a sequence of values.

### Solution

```jsx
import { useState, useCallback } from 'react';

function useCycle(...items) {
    const [index, setIndex] = useState(0);

    const current = items[index];

    const next = useCallback(() => {
        setIndex(prev => (prev + 1) % items.length);
    }, [items.length]);

    const previous = useCallback(() => {
        setIndex(prev => (prev - 1 + items.length) % items.length);
    }, [items.length]);

    const goTo = useCallback((targetIndex) => {
        if (targetIndex >= 0 && targetIndex < items.length) {
            setIndex(targetIndex);
        }
    }, [items.length]);

    return {
        current,
        next,
        previous,
        goTo,
        index
    };
}

// Usage
function ThemeSwitcher() {
    const { current: theme, next } = useCycle('light', 'dark', 'auto');

    return (
        <button onClick={next}>
            Current theme: {theme}
        </button>
    );
}
```

---

## Key Patterns

1. **State Encapsulation**: Hide implementation details
2. **Memoization**: useCallback for stable references
3. **Event Management**: Add/remove listeners properly
4. **Cleanup**: Always clean up effects
5. **Flexibility**: Configurable and reusable
6. **Type Safety**: Handle edge cases

## Best Practices

- ✅ Always clean up event listeners
- ✅ Use useCallback for returned functions
- ✅ Handle SSR (server-side rendering)
- ✅ Provide clear API
- ✅ Document hook behavior
- ✅ Test edge cases

