# React Event Handling

Complete guide to handling events in React.

## Synthetic Events

React wraps native events in SyntheticEvent objects for cross-browser compatibility.

### Basic Event Handling

```jsx
function Button() {
    const handleClick = (e) => {
        e.preventDefault();
        console.log('Clicked');
    };

    return <button onClick={handleClick}>Click me</button>;
}
```

### Event Object

```jsx
function Input() {
    const handleChange = (e) => {
        console.log(e.target.value); // Input value
        console.log(e.target.name);  // Input name
        console.log(e.type);         // Event type
    };

    return <input onChange={handleChange} />;
}
```

## Common Events

### Mouse Events

```jsx
function MouseEvents() {
    return (
        <div
            onClick={(e) => console.log('click')}
            onDoubleClick={(e) => console.log('double click')}
            onMouseDown={(e) => console.log('mouse down')}
            onMouseUp={(e) => console.log('mouse up')}
            onMouseEnter={(e) => console.log('mouse enter')}
            onMouseLeave={(e) => console.log('mouse leave')}
            onMouseOver={(e) => console.log('mouse over')}
            onMouseOut={(e) => console.log('mouse out')}
            onMouseMove={(e) => console.log('mouse move')}
        >
            Hover and click me
        </div>
    );
}
```

### Keyboard Events

```jsx
function KeyboardEvents() {
    const handleKeyDown = (e) => {
        console.log('Key:', e.key);
        console.log('Code:', e.code);
        console.log('Ctrl:', e.ctrlKey);
        console.log('Shift:', e.shiftKey);
        console.log('Alt:', e.altKey);
        
        if (e.key === 'Enter') {
            console.log('Enter pressed');
        }
    };

    return <input onKeyDown={handleKeyDown} />;
}
```

### Form Events

```jsx
function FormEvents() {
    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission
    };

    const handleChange = (e) => {
        console.log(e.target.value);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input onChange={handleChange} />
            <button type="submit">Submit</button>
        </form>
    );
}
```

## Event Handler Patterns

### Inline Handlers

```jsx
<button onClick={() => console.log('clicked')}>Click</button>
```

### Named Handlers

```jsx
function Component() {
    const handleClick = () => {
        console.log('clicked');
    };
    
    return <button onClick={handleClick}>Click</button>;
}
```

### With Parameters

```jsx
function List({ items }) {
    const handleClick = (id) => {
        console.log('Clicked item:', id);
    };

    return (
        <ul>
            {items.map(item => (
                <li key={item.id} onClick={() => handleClick(item.id)}>
                    {item.name}
                </li>
            ))}
        </ul>
    );
}
```

### Event Pooling (React 16 and below)

```jsx
// React 16: Events are pooled
function Component() {
    const handleClick = (e) => {
        // e is nullified after handler
        setTimeout(() => {
            console.log(e.type); // Error in React 16
        }, 100);
        
        // Solution: persist event
        e.persist();
        setTimeout(() => {
            console.log(e.type); // Works
        }, 100);
    };
}
```

## Event Bubbling and Capturing

```jsx
function EventBubbling() {
    const handleParentClick = () => {
        console.log('Parent clicked');
    };

    const handleChildClick = (e) => {
        console.log('Child clicked');
        e.stopPropagation(); // Stop bubbling
    };

    return (
        <div onClick={handleParentClick}>
            <button onClick={handleChildClick}>Click</button>
        </div>
    );
}

// Capturing phase
function EventCapturing() {
    return (
        <div onClickCapture={() => console.log('Parent capture')}>
            <button onClickCapture={() => console.log('Child capture')}>
                Click
            </button>
        </div>
    );
}
```

## Best Practices

1. **Named Handlers**: Use named functions for clarity
2. **Stop Propagation**: Use stopPropagation() when needed
3. **Prevent Default**: Use preventDefault() for form submissions
4. **Event Pooling**: Be aware of event pooling in React 16
5. **Performance**: Avoid inline functions in render for performance

