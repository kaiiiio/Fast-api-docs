# DOM Events Complete Guide: Keyboard, Pointer, Mouse

Complete guide to DOM events with examples.

## 1. Keyboard Events

### Question
How to handle keyboard events (onKeyDown, onKeyPress, onKeyUp)?

### Solution

```jsx
function KeyboardHandler() {
    const handleKeyDown = (e) => {
        console.log('Key down:', e.key, e.code);
        
        // Special keys
        if (e.key === 'Enter') {
            console.log('Enter pressed');
        }
        if (e.key === 'Escape') {
            console.log('Escape pressed');
        }
        
        // Modifiers
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            console.log('Ctrl+S pressed');
        }
        
        // Key codes
        if (e.keyCode === 13) { // Enter (deprecated)
            console.log('Enter (keyCode)');
        }
    };
    
    const handleKeyPress = (e) => {
        // Only printable characters
        console.log('Key press:', e.key);
    };
    
    const handleKeyUp = (e) => {
        console.log('Key up:', e.key);
    };
    
    return (
        <input
            onKeyDown={handleKeyDown}
            onKeyPress={handleKeyPress}
            onKeyUp={handleKeyUp}
            placeholder="Type something..."
        />
    );
}
```

### Keyboard Event Flow

```
User presses key
       │
       ▼
┌──────────────┐
│  keydown    │ ← First (all keys)
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  keypress    │ ← Only printable (deprecated)
└──────┬──────┘
       │
       ▼
┌──────────────┐
│   keyup      │ ← Last (all keys)
└──────────────┘
```

### Common Key Values

```javascript
// Special keys
'Enter', 'Escape', 'Tab', 'Space', 'Backspace', 'Delete'
'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
'Home', 'End', 'PageUp', 'PageDown'

// Modifiers
e.ctrlKey   // Ctrl key pressed
e.shiftKey  // Shift key pressed
e.altKey    // Alt key pressed
e.metaKey   // Meta/Cmd key pressed
```

---

## 2. Pointer Events

### Question
How to handle pointer events (mouse, touch, pen)?

### Solution

```jsx
function PointerHandler() {
    const handlePointerDown = (e) => {
        console.log('Pointer down:', e.pointerId, e.pointerType);
        // pointerType: 'mouse', 'touch', 'pen'
    };
    
    const handlePointerMove = (e) => {
        console.log('Pointer move:', e.clientX, e.clientY);
    };
    
    const handlePointerUp = (e) => {
        console.log('Pointer up:', e.pointerId);
    };
    
    const handlePointerEnter = (e) => {
        console.log('Pointer entered');
    };
    
    const handlePointerLeave = (e) => {
        console.log('Pointer left');
    };
    
    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            style={{ width: 200, height: 200, background: 'lightblue' }}
        >
            Pointer area
        </div>
    );
}
```

### Pointer Event Flow

```
Pointer enters element
       │
       ▼
┌──────────────┐
│ pointerenter │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ pointerdown  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ pointermove  │ (multiple)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  pointerup   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ pointerleave │
└──────────────┘
```

---

## 3. Mouse Events

### Question
How to handle mouse events?

### Solution

```jsx
function MouseHandler() {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    const handleMouseDown = (e) => {
        console.log('Mouse down:', e.button);
        // button: 0 (left), 1 (middle), 2 (right)
    };
    
    const handleMouseMove = (e) => {
        setPosition({ x: e.clientX, e.clientY });
    };
    
    const handleMouseUp = (e) => {
        console.log('Mouse up');
    };
    
    const handleClick = (e) => {
        console.log('Click:', e.detail); // Click count
    };
    
    const handleDoubleClick = (e) => {
        console.log('Double click');
    };
    
    const handleContextMenu = (e) => {
        e.preventDefault();
        console.log('Right click');
    };
    
    const handleMouseEnter = (e) => {
        console.log('Mouse entered');
    };
    
    const handleMouseLeave = (e) => {
        console.log('Mouse left');
    };
    
    const handleMouseOver = (e) => {
        console.log('Mouse over');
    };
    
    const handleMouseOut = (e) => {
        console.log('Mouse out');
    };
    
    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
        >
            Mouse area: {position.x}, {position.y}
        </div>
    );
}
```

### Mouse Event Coordinates

```javascript
// Different coordinate systems
e.clientX, e.clientY  // Relative to viewport
e.pageX, e.pageY      // Relative to document
e.screenX, e.screenY // Relative to screen
e.offsetX, e.offsetY // Relative to element
```

---

## 4. Touch Events

### Question
How to handle touch events?

### Solution

```jsx
function TouchHandler() {
    const [touches, setTouches] = useState([]);
    
    const handleTouchStart = (e) => {
        const touchArray = Array.from(e.touches);
        setTouches(touchArray.map(t => ({
            id: t.identifier,
            x: t.clientX,
            y: t.clientY
        })));
    };
    
    const handleTouchMove = (e) => {
        e.preventDefault(); // Prevent scrolling
        const touchArray = Array.from(e.touches);
        setTouches(touchArray.map(t => ({
            id: t.identifier,
            x: t.clientX,
            y: t.clientY
        })));
    };
    
    const handleTouchEnd = (e) => {
        setTouches([]);
    };
    
    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
        >
            {touches.length} touch(es)
        </div>
    );
}
```

---

## 5. Event Bubbling and Capturing

### Question
How does event bubbling and capturing work?

### Solution

```jsx
function EventBubbling() {
    const handleParentClick = (e) => {
        console.log('Parent clicked');
    };
    
    const handleChildClick = (e) => {
        console.log('Child clicked');
        // e.stopPropagation(); // Stop bubbling
    };
    
    return (
        <div onClick={handleParentClick}>
            <button onClick={handleChildClick}>
                Click me
            </button>
        </div>
    );
}

// Capturing phase
function EventCapturing() {
    const handleParentCapture = (e) => {
        console.log('Parent capture');
    };
    
    const handleChildCapture = (e) => {
        console.log('Child capture');
    };
    
    return (
        <div onClickCapture={handleParentCapture}>
            <button onClickCapture={handleChildCapture}>
                Click me
            </button>
        </div>
    );
}
```

### Event Flow

```
CAPTURING PHASE (top to bottom):
┌─────────────────────────────────────┐
│ Document                             │
│   ↓ (capture)                        │
│ ┌─────────────────────────────────┐ │
│ │ Parent                            │ │
│ │   ↓ (capture)                    │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Child                        │ │ │
│ │ │   ↓ (target)                │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

BUBBLING PHASE (bottom to top):
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Child                        │ │ │
│ │ │   ↑ (bubble)                │ │ │
│ │ └─────────────────────────────┘ │ │
│ │   ↑ (bubble)                    │ │
│ │ Parent                          │ │
│ └─────────────────────────────────┘ │
│   ↑ (bubble)                        │
│ Document                            │
└─────────────────────────────────────┘
```

---

## 6. Cursor Pointer

### Question
How to handle cursor pointer and cursor styles?

### Solution

```jsx
function CursorPointer() {
    const [cursor, setCursor] = useState('default');
    
    const cursorStyles = {
        default: 'default',
        pointer: 'pointer',
        grab: 'grab',
        grabbing: 'grabbing',
        text: 'text',
        move: 'move',
        wait: 'wait',
        help: 'help',
        notAllowed: 'not-allowed',
        crosshair: 'crosshair'
    };
    
    return (
        <div>
            <div style={{ cursor: cursor }}>
                Hover me (cursor: {cursor})
            </div>
            
            {Object.entries(cursorStyles).map(([key, value]) => (
                <button
                    key={key}
                    onClick={() => setCursor(value)}
                    style={{ cursor: value, margin: 5 }}
                >
                    {key}
                </button>
            ))}
        </div>
    );
}

// Custom cursor
function CustomCursor() {
    return (
        <div style={{ cursor: 'url(cursor.png), auto' }}>
            Custom cursor
        </div>
    );
}
```

### Cursor Types Visual

```
default:     ↖ (normal arrow)
pointer:     👆 (hand pointing)
grab:        ✋ (open hand)
grabbing:    ✊ (closed hand)
text:        | (text cursor)
move:        ↔ (move arrows)
wait:        ⏳ (loading)
help:        ? (question mark)
not-allowed: 🚫 (prohibited)
crosshair:   + (crosshair)
```

---

## 7. Event Delegation

### Question
How to use event delegation for dynamic lists?

### Solution

```jsx
function EventDelegation() {
    const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);
    
    const handleListClick = (e) => {
        // Event delegation
        if (e.target.tagName === 'LI') {
            console.log('Clicked:', e.target.textContent);
        }
    };
    
    return (
        <ul onClick={handleListClick}>
            {items.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
}
```

---

## Key Concepts

1. **Keyboard Events**: keydown, keypress, keyup
2. **Pointer Events**: Unified mouse/touch/pen
3. **Mouse Events**: click, mousemove, mouseenter
4. **Touch Events**: touchstart, touchmove, touchend
5. **Event Flow**: Capturing → Target → Bubbling
6. **Cursor Styles**: pointer, grab, text, etc.
7. **Event Delegation**: Handle events on parent

## Best Practices

- ✅ Use pointer events for cross-device support
- ✅ Prevent default when needed
- ✅ Stop propagation carefully
- ✅ Clean up event listeners
- ✅ Use event delegation for lists
- ✅ Handle touch events for mobile

