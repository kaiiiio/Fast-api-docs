# React State and Props

Complete guide to managing state and props in React.

## Props (Properties)

Props are read-only data passed from parent to child components.

### Passing Props

```jsx
// Parent component
function App() {
    const user = { name: 'John', age: 30 };
    return <UserCard name={user.name} age={user.age} />;
}

// Child component
function UserCard({ name, age }) {
    return (
        <div>
            <h2>{name}</h2>
            <p>Age: {age}</p>
        </div>
    );
}
```

### Props Types

```jsx
// Primitives
<Button text="Click me" count={5} isActive={true} />

// Objects
<UserCard user={{ name: 'John', age: 30 }} />

// Arrays
<List items={['item1', 'item2']} />

// Functions
<Button onClick={() => console.log('clicked')} />

// React elements (children)
<Container>
    <Header />
    <Content />
</Container>
```

### Default Props

```jsx
// Functional component
function Button({ text = 'Click me', onClick }) {
    return <button onClick={onClick}>{text}</button>;
}

// Class component
class Button extends React.Component {
    static defaultProps = {
        text: 'Click me'
    };
}
```

## State

State is mutable data that belongs to a component.

### useState Hook

```jsx
import { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <p>{count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

### State Updates

```jsx
// Direct update
setCount(count + 1);

// Functional update (recommended)
setCount(prev => prev + 1);

// Object state
const [user, setUser] = useState({ name: '', age: 0 });
setUser(prev => ({ ...prev, name: 'John' }));

// Array state
const [items, setItems] = useState([]);
setItems(prev => [...prev, newItem]);
```

### Multiple State Variables

```jsx
function Form() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState(0);
    
    // Or combine
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        age: 0
    });
}
```

## Props vs State

| Props | State |
|-------|-------|
| Passed from parent | Managed in component |
| Read-only | Mutable |
| Cannot be changed | Can be changed with setState |
| Used for configuration | Used for dynamic data |

## Lifting State Up

When multiple components need the same state, lift it to their common parent.

```jsx
function App() {
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <Display count={count} />
            <Controls count={count} setCount={setCount} />
        </div>
    );
}

function Display({ count }) {
    return <div>Count: {count}</div>;
}

function Controls({ count, setCount }) {
    return (
        <div>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount(count - 1)}>-</button>
        </div>
    );
}
```

## Best Practices

1. **Props**: Use for configuration and data from parent
2. **State**: Use for component-specific data
3. **Lift State**: When multiple components need same data
4. **Immutable Updates**: Always create new objects/arrays
5. **Functional Updates**: Use when new state depends on previous

