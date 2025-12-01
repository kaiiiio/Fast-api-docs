# React Fundamentals: Props, JSX, Components, Destructuring

Complete guide to React fundamentals with visual examples.

## 1. Passing Props in JSX

### Question
How to pass props in JSX, including event handlers like KeyboardEvent.

### Solution

```jsx
// Basic props
function Welcome({ name, age }) {
    return <h1>Hello, {name}! You are {age} years old.</h1>;
}

// Usage
<Welcome name="John" age={30} />

// Event handlers as props
function Button({ onClick, children }) {
    return <button onClick={onClick}>{children}</button>;
}

// Passing KeyboardEvent handler
function Input({ onKeyDown, onKeyPress, onKeyUp }) {
    return (
        <input
            onKeyDown={onKeyDown}
            onKeyPress={onKeyPress}
            onKeyUp={onKeyUp}
        />
    );
}

// Usage with KeyboardEvent
function App() {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            console.log('Enter pressed');
        }
    };

    return <Input onKeyDown={handleKeyDown} />;
}
```

### Visual Example

```
Props Flow:
┌─────────────┐
│   Parent    │
│  Component  │
└──────┬──────┘
       │ props: { name: "John", age: 30 }
       ▼
┌─────────────┐
│   Child     │
│  Component  │
│  (Welcome)  │
└─────────────┘
```

---

## 2. Image Component

### Question
How to create and use an Image component in React.

### Solution

```jsx
// Basic Image component
function Image({ src, alt, width, height, className }) {
    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={className}
            loading="lazy"
        />
    );
}

// Advanced Image with error handling
function ImageWithFallback({ src, alt, fallback, ...props }) {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    const handleError = () => {
        if (!hasError) {
            setHasError(true);
            setImgSrc(fallback || '/placeholder.png');
        }
    };

    return (
        <img
            src={imgSrc}
            alt={alt}
            onError={handleError}
            {...props}
        />
    );
}

// Usage
<Image
    src="/photo.jpg"
    alt="Profile picture"
    width={200}
    height={200}
    className="rounded"
/>

<ImageWithFallback
    src="/photo.jpg"
    alt="Profile"
    fallback="/default.jpg"
/>
```

---

## 3. Component Return Patterns

### Question
Different ways to return components in React.

### Solution

```jsx
// Single return
function Component1() {
    return <div>Hello</div>;
}

// Multiple elements with Fragment
function Component2() {
    return (
        <>
            <h1>Title</h1>
            <p>Content</p>
        </>
    );
}

// Explicit Fragment
function Component3() {
    return (
        <React.Fragment>
            <h1>Title</h1>
            <p>Content</p>
        </React.Fragment>
    );
}

// Array of elements
function Component4() {
    return [
        <div key="1">First</div>,
        <div key="2">Second</div>
    ];
}

// Conditional return
function Component5({ isLoggedIn }) {
    if (isLoggedIn) {
        return <div>Welcome back!</div>;
    }
    return <div>Please log in</div>;
}

// Early return pattern
function Component6({ user }) {
    if (!user) return null;
    
    return <div>Hello, {user.name}</div>;
}
```

### Visual Representation

```
Return Patterns:

Single Element:
┌─────────────┐
│  Component  │
└──────┬──────┘
       │
       ▼
    <div>Hello</div>

Fragment:
┌─────────────┐
│  Component  │
└──────┬──────┘
       │
       ▼
   ┌───────┐
   │  <>   │
   │  <h1> │
   │  <p>  │
   └───────┘

Conditional:
┌─────────────┐
│  Component  │
└──────┬──────┘
       │
       ├─ true  → <Welcome />
       └─ false → <Login />
```

---

## 4. Destructuring in React

### Question
How to use destructuring with props, state, and objects.

### Solution

```jsx
// Props destructuring
function UserCard({ name, email, age }) {
    return (
        <div>
            <h2>{name}</h2>
            <p>{email}</p>
            <p>Age: {age}</p>
        </div>
    );
}

// Nested destructuring
function UserProfile({ user: { name, address: { city, country } } }) {
    return (
        <div>
            <h2>{name}</h2>
            <p>{city}, {country}</p>
        </div>
    );
}

// State destructuring
function Counter() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    
    return (
        <div>
            <p>{count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}

// Array destructuring
function List() {
    const [first, second, ...rest] = ['a', 'b', 'c', 'd'];
    return <div>{first}, {second}</div>;
}

// Default values
function Greeting({ name = 'Guest', age = 0 }) {
    return <div>Hello, {name}! Age: {age}</div>;
}

// Rest props
function Button({ type, children, ...rest }) {
    return (
        <button type={type} {...rest}>
            {children}
        </button>
    );
}
```

### Visual Example

```
Destructuring:

Props:
┌─────────────────┐
│ { name, email } │  ← Destructured
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │  name  │  ← Direct access
    │  email │
    └────────┘

Without Destructuring:
┌─────────┐
│  props  │
└────┬────┘
     │
     ▼
props.name   ← Need props. prefix
props.email
```

---

## 5. Passing KeyboardEvent

### Question
How to handle and pass KeyboardEvent in React components.

### Solution

```jsx
// KeyboardEvent handler
function SearchInput({ onSearch }) {
    const handleKeyDown = (e) => {
        // KeyboardEvent properties
        console.log(e.key);        // 'Enter', 'Escape', etc.
        console.log(e.code);       // 'Enter', 'Escape', etc.
        console.log(e.keyCode);    // 13 for Enter (deprecated)
        console.log(e.ctrlKey);    // true if Ctrl pressed
        console.log(e.shiftKey);   // true if Shift pressed
        console.log(e.altKey);     // true if Alt pressed
        console.log(e.metaKey);    // true if Meta/Cmd pressed
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSearch(e.target.value);
        }
    };

    return <input onKeyDown={handleKeyDown} />;
}

// Passing KeyboardEvent to parent
function Input({ onKeyEvent }) {
    const handleKeyDown = (e) => {
        // Pass entire event or specific data
        onKeyEvent({
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            target: e.target.value
        });
    };

    return <input onKeyDown={handleKeyDown} />;
}

// Custom keyboard hook
function useKeyboard(handler) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            handler(e);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handler]);
}

// Usage
function App() {
    useKeyboard((e) => {
        if (e.key === 'Escape') {
            console.log('Escape pressed');
        }
    });

    return <div>Press Escape</div>;
}
```

### Keyboard Event Flow

```
User presses key
       │
       ▼
┌──────────────┐
│ KeyboardEvent │
└──────┬───────┘
       │
       ├─ key: 'Enter'
       ├─ code: 'Enter'
       ├─ ctrlKey: false
       └─ shiftKey: false
       │
       ▼
┌──────────────┐
│   Handler     │
│  (onKeyDown)  │
└──────┬───────┘
       │
       ▼
   Action taken
```

---

## 6. AudioData Component

### Question
How to work with AudioData and audio in React.

### Solution

```jsx
// Audio player component
function AudioPlayer({ src }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        
        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
        };
    }, []);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="audio-player">
            <audio ref={audioRef} src={src} />
            <button onClick={togglePlay}>
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={(e) => {
                    audioRef.current.currentTime = e.target.value;
                }}
            />
            <span>{Math.floor(currentTime)}s / {Math.floor(duration)}s</span>
        </div>
    );
}

// Audio visualization
function AudioVisualizer({ audioData }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw audio waveform
            const barWidth = canvas.width / audioData.length;
            audioData.forEach((value, index) => {
                const barHeight = value * canvas.height;
                ctx.fillRect(
                    index * barWidth,
                    canvas.height - barHeight,
                    barWidth - 2,
                    barHeight
                );
            });
            
            requestAnimationFrame(draw);
        };
        
        draw();
    }, [audioData]);

    return <canvas ref={canvasRef} width={800} height={200} />;
}
```

---

## Key Concepts

1. **Props Passing**: Direct, spread, event handlers
2. **JSX Syntax**: Elements, fragments, expressions
3. **Component Returns**: Single, multiple, conditional
4. **Destructuring**: Props, state, nested objects
5. **Event Handling**: KeyboardEvent, MouseEvent
6. **Audio Handling**: AudioData, Web Audio API

## Best Practices

- ✅ Use destructuring for cleaner code
- ✅ Handle events properly
- ✅ Use fragments for multiple elements
- ✅ Provide default values
- ✅ Type check props
- ✅ Handle edge cases

