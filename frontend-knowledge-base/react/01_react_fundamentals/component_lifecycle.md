# React Component Lifecycle

Complete guide to React component lifecycle in class and functional components.

## What is SPA (Single Page Application)?

A **Single Page Application (SPA)** is a web application that loads a single HTML page and dynamically updates content as the user interacts with the app, without requiring full page reloads from the server.

### How SPAs Work

```
Traditional Multi-Page App:
User clicks link → Browser requests new page → Server sends HTML → Full page reload

Single Page App:
User clicks link → JavaScript intercepts → Fetch data (JSON) → Update DOM dynamically
```

### Key Characteristics

1. **Single HTML Load**: Only one initial HTML page is loaded
2. **Dynamic Updates**: Content changes via JavaScript without page refresh
3. **Client-Side Routing**: Navigation handled by JavaScript (e.g., React Router)
4. **API Communication**: Data fetched via AJAX/Fetch from backend APIs

### React as an SPA Framework

React is commonly used to build SPAs because:

```jsx
// React handles dynamic UI updates efficiently
function App() {
    const [page, setPage] = useState('home');
    
    // No page reload - just component re-render
    return (
        <div>
            <nav>
                <button onClick={() => setPage('home')}>Home</button>
                <button onClick={() => setPage('about')}>About</button>
            </nav>
            {page === 'home' ? <HomePage /> : <AboutPage />}
        </div>
    );
}
```

### Benefits of SPAs

- **Fast Navigation**: No full page reloads after initial load
- **Better UX**: Smooth, app-like experience
- **Reduced Server Load**: Server only sends data (JSON), not full HTML
- **Code Reusability**: Components can be reused across different views

### Drawbacks of SPAs

- **SEO Challenges**: Search engines may struggle with JavaScript-rendered content
- **Initial Load Time**: Larger JavaScript bundle to download upfront
- **Browser History**: Requires manual handling of back/forward navigation
- **JavaScript Dependency**: App won't work if JavaScript is disabled

### SPA vs Traditional Apps

| Aspect | SPA | Traditional MPA |
|--------|-----|-----------------|
| Page Load | Once | Every navigation |
| Performance | Fast after initial load | Slower navigation |
| SEO | Requires SSR/SSG | Native support |
| Complexity | Higher | Lower |
| User Experience | App-like | Website-like |

### React Lifecycle in SPA Context

Understanding component lifecycle is crucial in SPAs because:
- Components mount/unmount as users navigate
- Data fetching happens in lifecycle methods
- Cleanup prevents memory leaks in long-running apps
- Efficient updates improve SPA performance

## Class Component Lifecycle

### Mounting Phase

```jsx
class Component extends React.Component {
    // 1. Constructor
    constructor(props) {
        super(props);
        this.state = { count: 0 };
        // Initialize state, bind methods
    }

    // 2. getDerivedStateFromProps (rarely used)
    static getDerivedStateFromProps(props, state) {
        // Called before every render
        // Return new state or null
        if (props.value !== state.prevValue) {
            return { prevValue: props.value, count: 0 };
        }
        return null;
    }

    // 3. render
    render() {
        // Return JSX
        return <div>{this.state.count}</div>;
    }

    // 4. componentDidMount
    componentDidMount() {
        // Component mounted to DOM
        // Good for: API calls, subscriptions, DOM manipulation
        this.timer = setInterval(() => {
            this.setState({ count: this.state.count + 1 });
        }, 1000);
    }
}
```

### Updating Phase

```jsx
class Component extends React.Component {
    // 1. getDerivedStateFromProps
    static getDerivedStateFromProps(props, state) {
        // Called on every update
        return null;
    }

    // 2. shouldComponentUpdate
    shouldComponentUpdate(nextProps, nextState) {
        // Return false to prevent re-render
        return nextProps.value !== this.props.value;
    }

    // 3. render
    render() {
        return <div>{this.state.count}</div>;
    }

    // 4. getSnapshotBeforeUpdate
    getSnapshotBeforeUpdate(prevProps, prevState) {
        // Called before DOM update
        // Return value passed to componentDidUpdate
        return { scrollPosition: window.scrollY };
    }

    // 5. componentDidUpdate
    componentDidUpdate(prevProps, prevState, snapshot) {
        // Component updated
        // Good for: DOM updates, API calls based on props
        if (prevProps.userId !== this.props.userId) {
            this.fetchUser(this.props.userId);
        }
    }
}
```

### Unmounting Phase

```jsx
class Component extends React.Component {
    componentWillUnmount() {
        // Component about to unmount
        // Cleanup: remove listeners, cancel requests, clear timers
        clearInterval(this.timer);
        this.subscription.unsubscribe();
    }
}
```

## Functional Component Lifecycle

### useEffect Hook

```jsx
function Component() {
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
        console.log('Value changed');
    }, [value]); // Run when value changes

    // componentDidMount + componentDidUpdate
    useEffect(() => {
        console.log('Component mounted or updated');
    }); // No deps = run on every render
}
```

## Lifecycle Mapping

| Class Component | Functional Component |
|----------------|----------------------|
| constructor | useState, useRef |
| componentDidMount | useEffect(..., []) |
| componentDidUpdate | useEffect(..., [deps]) |
| componentWillUnmount | useEffect cleanup |
| shouldComponentUpdate | React.memo |
| getDerivedStateFromProps | useState + useEffect |

## Common Patterns

### Fetching Data

```jsx
// Class Component
class UserProfile extends React.Component {
    componentDidMount() {
        this.fetchUser(this.props.userId);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.userId !== this.props.userId) {
            this.fetchUser(this.props.userId);
        }
    }

    componentWillUnmount() {
        this.abortController.abort();
    }
}

// Functional Component
function UserProfile({ userId }) {
    useEffect(() => {
        const controller = new AbortController();
        fetchUser(userId, { signal: controller.signal });
        return () => controller.abort();
    }, [userId]);
}
```

### Subscriptions

```jsx
// Class Component
class ChatRoom extends React.Component {
    componentDidMount() {
        this.subscription = subscribeToMessages(this.props.roomId);
    }

    componentWillUnmount() {
        this.subscription.unsubscribe();
    }
}

// Functional Component
function ChatRoom({ roomId }) {
    useEffect(() => {
        const subscription = subscribeToMessages(roomId);
        return () => subscription.unsubscribe();
    }, [roomId]);
}
```

## Best Practices

1. **Cleanup**: Always clean up in componentWillUnmount/useEffect cleanup
2. **Dependencies**: Include all dependencies in useEffect
3. **Avoid**: Don't use componentWillMount, componentWillReceiveProps (deprecated)
4. **Performance**: Use shouldComponentUpdate or React.memo when needed
5. **State Updates**: Avoid state updates in render

