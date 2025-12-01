# JSX and React Rendering

Complete guide to JSX syntax and React rendering mechanism.

## What is JSX?

JSX (JavaScript XML) is a syntax extension that allows writing HTML-like code in JavaScript.

### Basic JSX

```jsx
// JSX
const element = <h1>Hello, World!</h1>;

// Compiled to (React.createElement)
const element = React.createElement('h1', null, 'Hello, World!');
```

### JSX Rules

```jsx
// 1. Must return single element (or Fragment)
function Component() {
    return (
        <div>
            <h1>Title</h1>
            <p>Content</p>
        </div>
    );
}

// 2. Use className instead of class
<div className="container">Content</div>

// 3. Self-closing tags
<img src="photo.jpg" alt="Photo" />
<input type="text" />

// 4. JavaScript expressions in {}
const name = "John";
<div>Hello, {name}</div>

// 5. Conditional rendering
{isLoggedIn && <Dashboard />}
{error && <Error message={error} />}
```

## JSX Transformation

### Old Transform (React 16 and below)

```jsx
// Input JSX
function App() {
    return <div>Hello</div>;
}

// Transformed to
function App() {
    return React.createElement('div', null, 'Hello');
}
```

### New Transform (React 17+)

```jsx
// Input JSX
function App() {
    return <div>Hello</div>;
}

// Transformed to (automatic import)
import { jsx as _jsx } from 'react/jsx-runtime';
function App() {
    return _jsx('div', { children: 'Hello' });
}
```

## JSX Expressions

```jsx
// Variables
const name = "John";
<div>{name}</div>

// Expressions
<div>{2 + 2}</div>
<div>{user.firstName + ' ' + user.lastName}</div>

// Functions
<div>{formatDate(new Date())}</div>

// Arrays
<div>{items.map(item => <div key={item.id}>{item.name}</div>)}</div>

// Ternary
<div>{isLoggedIn ? <Dashboard /> : <Login />}</div>

// Logical AND
<div>{error && <Error />}</div>
```

## Props in JSX

```jsx
// Passing props
<Button onClick={handleClick} disabled={false} label="Click me" />

// Spread props
const props = { onClick: handleClick, disabled: false };
<Button {...props} />

// Children prop
<Button>Click me</Button>
// Inside Button: {children} = "Click me"

// Multiple children
<Container>
    <Header />
    <Content />
    <Footer />
</Container>
```

## Event Handlers in JSX

```jsx
// Inline function
<button onClick={() => console.log('clicked')}>Click</button>

// Named function
function handleClick() {
    console.log('clicked');
}
<button onClick={handleClick}>Click</button>

// With parameters
<button onClick={(e) => handleClick(id, e)}>Click</button>

// Event object
<button onClick={(e) => {
    e.preventDefault();
    console.log(e.target);
}}>Click</button>
```

## Rendering Process

### 1. JSX Compilation

```
JSX → React.createElement() → Virtual DOM → Real DOM
```

### 2. Virtual DOM

```javascript
// Virtual DOM representation
{
    type: 'div',
    props: {
        className: 'container',
        children: [
            {
                type: 'h1',
                props: { children: 'Hello' }
            }
        ]
    }
}
```

### 3. Reconciliation

React compares Virtual DOM trees:
- **Diffing**: Find differences
- **Reconciliation**: Update only changed parts
- **Batching**: Group updates for performance

## Rendering Patterns

### Conditional Rendering

```jsx
// If/else
{condition ? <ComponentA /> : <ComponentB />}

// Early return
function Component({ user }) {
    if (!user) return null;
    return <div>Hello, {user.name}</div>;
}

// Logical AND
{isLoading && <Spinner />}

// Switch case
{(() => {
    switch (status) {
        case 'loading': return <Spinner />;
        case 'error': return <Error />;
        case 'success': return <Data />;
        default: return null;
    }
})()}
```

### List Rendering

```jsx
// Map
{items.map(item => (
    <div key={item.id}>{item.name}</div>
))}

// With index (avoid if possible)
{items.map((item, index) => (
    <div key={index}>{item.name}</div>
))}

// Filter + Map
{items
    .filter(item => item.active)
    .map(item => (
        <div key={item.id}>{item.name}</div>
    ))
}
```

## JSX Best Practices

1. **Keys**: Always use unique keys for lists
2. **Fragments**: Use <> or <Fragment> for multiple elements
3. **Extract complex logic**: Move complex JSX to separate functions
4. **Conditional rendering**: Use early returns for clarity
5. **Props validation**: Use PropTypes or TypeScript

## Common Patterns

```jsx
// Render prop pattern
<DataProvider render={data => <Display data={data} />} />

// Children as function
<Container>
    {({ data, loading }) => (
        loading ? <Spinner /> : <Data data={data} />
    )}
</Container>

// Compound components
<Select>
    <Select.Option value="1">Option 1</Select.Option>
    <Select.Option value="2">Option 2</Select.Option>
</Select>
```

