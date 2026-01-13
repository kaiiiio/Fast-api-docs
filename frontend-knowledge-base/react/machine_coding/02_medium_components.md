# Medium React Components: Tabs, Modal, Todo List, Star Rating

Complete solutions for medium-level React machine coding questions.

## 1. Tabs Component

### Question
Build a tabs component that displays a list of tab elements and one associated panel of content at a time.

### Solution

```jsx
import React, { useState } from 'react';

function Tabs({ items }) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="tabs">
            <div className="tabs-header" role="tablist">
                {items.map((item, index) => (
                    <button
                        key={index}
                        className={`tab-button ${activeTab === index ? 'active' : ''}`}
                        onClick={() => setActiveTab(index)}
                        role="tab"
                        aria-selected={activeTab === index}
                        aria-controls={`tab-panel-${index}`}
                        id={`tab-${index}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            
            <div className="tabs-content">
                {items.map((item, index) => (
                    <div
                        key={index}
                        id={`tab-panel-${index}`}
                        role="tabpanel"
                        aria-labelledby={`tab-${index}`}
                        className={`tab-panel ${activeTab === index ? 'active' : ''}`}
                        hidden={activeTab !== index}
                    >
                        {item.content}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Usage
const tabItems = [
    { label: 'Tab 1', content: <div>Content for Tab 1</div> },
    { label: 'Tab 2', content: <div>Content for Tab 2</div> },
    { label: 'Tab 3', content: <div>Content for Tab 3</div> }
];

function App() {
    return <Tabs items={tabItems} />;
}
```

### CSS

```css
.tabs {
    width: 100%;
}

.tabs-header {
    display: flex;
    border-bottom: 2px solid #e0e0e0;
}

.tab-button {
    padding: 1rem 2rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #666;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.3s;
}

.tab-button:hover {
    color: #007bff;
    background: #f5f5f5;
}

.tab-button.active {
    color: #007bff;
    border-bottom-color: #007bff;
    font-weight: 600;
}

.tabs-content {
    padding: 2rem;
    min-height: 200px;
}

.tab-panel {
    display: none;
}

.tab-panel.active {
    display: block;
}
```

### Explanation
- **State Management**: `activeTab` tracks currently selected tab
- **Conditional Rendering**: Only active panel is visible
- **Accessibility**: ARIA attributes for screen readers
- **Keyboard Navigation**: Can be enhanced with arrow keys

### ARIA Attributes Explained

> **ARIA (Accessible Rich Internet Applications)** attributes help screen readers and assistive technologies understand interactive components.

#### **role="tablist"** (Line 20)
- **What it does:** Tells screen readers this is a container for tabs
- **Why:** Screen readers announce "tab list" so users know they can navigate between tabs

#### **role="tab"** (Line 26)
- **What it does:** Identifies each button as a tab
- **Why:** Screen readers announce "tab" for each button, helping users understand the navigation structure

#### **aria-selected={activeTab === index}** (Line 27)
- **What it does:** Indicates which tab is currently active
  - `aria-selected="true"` → This tab is selected
  - `aria-selected="false"` → This tab is not selected
- **Why:** Screen readers announce "selected" for the active tab, helping users know their current position
- **Example:** If Tab 2 is active, screen reader says "Tab 2, selected"

#### **aria-controls={`tab-panel-${index}`}** (Line 28)
- **What it does:** Links the tab button to its corresponding content panel
  - Creates a relationship: "This tab controls that panel"
- **Why:** Screen readers can announce which content area will be shown when tab is clicked
- **Example:** `aria-controls="tab-panel-0"` means this tab controls the panel with `id="tab-panel-0"`

#### **id={`tab-${index}`}** (Line 29)
- **What it does:** Unique identifier for each tab button
- **Why:** Used by `aria-labelledby` in the panel to create bidirectional relationship

#### **role="tabpanel"** (Line 41)
- **What it does:** Identifies the content area as a tab panel
- **Why:** Screen readers announce "tab panel" so users know this is the content area

#### **aria-labelledby={`tab-${index}`}** (Line 42)
- **What it does:** Links the panel back to its tab button
  - Creates reverse relationship: "This panel is labeled by that tab"
- **Why:** Screen readers can announce the tab's label when entering the panel
- **Example:** When user enters panel, screen reader says "Tab 1 panel"

#### **hidden={activeTab !== index}** (Line 44)
- **What it does:** Hides inactive panels from screen readers AND visual display
- **Why:** Prevents screen readers from reading hidden content, improves navigation

### Complete ARIA Flow Example

```jsx
// Tab Button (index = 0, activeTab = 0)
<button
    role="tab"                          // "This is a tab"
    aria-selected={true}                // "It's selected"
    aria-controls="tab-panel-0"         // "It controls panel 0"
    id="tab-0"                          // "My ID is tab-0"
>
    Tab 1
</button>

// Tab Panel (index = 0, activeTab = 0)
<div
    role="tabpanel"                     // "This is a tab panel"
    aria-labelledby="tab-0"             // "I'm labeled by tab-0"
    id="tab-panel-0"                    // "My ID is tab-panel-0"
    hidden={false}                      // "I'm visible"
>
    Content for Tab 1
</div>
```

**Screen Reader Announcement:**
1. User focuses Tab 1 button: "Tab 1, tab, selected, 1 of 3"
2. User presses Enter: "Tab 1 panel, content for Tab 1"
3. User focuses Tab 2 button: "Tab 2, tab, not selected, 2 of 3"

### Why This Matters

✅ **Without ARIA:** Screen reader says "Button, Tab 1" (confusing)
✅ **With ARIA:** Screen reader says "Tab 1, tab, selected, controls tab panel 0" (clear!)

**Benefits:**
- Blind users can navigate tabs easily
- Keyboard users know which tab is active
- Assistive technologies understand the tab structure
- Improves SEO (search engines understand page structure)


### Visualization
```
[Tab 1] [Tab 2] [Tab 3]
───────────────────────
Content for Tab 1
```

---

## 2. Modal Dialog

### Question
Build a reusable modal dialog component that can be opened and closed.

### Solution

```jsx
import React, { useEffect } from 'react';

function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Usage
function App() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div>
            <button onClick={() => setIsModalOpen(true)}>Open Modal</button>
            
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Modal Title"
            >
                <p>This is the modal content.</p>
            </Modal>
        </div>
    );
}
```

### CSS

```css
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.2s;
}

.modal-content {
    background: white;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideUp 0.3s;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
}

.modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #666;
    line-height: 1;
}

.modal-close:hover {
    color: #000;
}

.modal-body {
    padding: 1.5rem;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
```

### Explanation
- **Portal Pattern**: Renders outside main DOM tree
- **Body Scroll Lock**: Prevents background scrolling when open
- **Escape Key**: Closes modal on Escape press
- **Click Outside**: Closes when clicking overlay
- **Animations**: Smooth fade and slide animations

### Visualization
```
┌─────────────────────────┐
│  [×] Modal Title        │
├─────────────────────────┤
│                         │
│  This is the modal      │
│  content.               │
│                         │
└─────────────────────────┘
```

---

## 3. Todo List

### Question
Build a Todo list that lets users add new tasks and delete existing tasks.

### Solution

```jsx
import React, { useState } from 'react';

function TodoList() {
    const [todos, setTodos] = useState([]);
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        if (inputValue.trim()) {
            const newTodo = {
                id: Date.now(),
                text: inputValue.trim(),
                completed: false
            };
            setTodos([...todos, newTodo]);
            setInputValue('');
        }
    };

    const handleDelete = (id) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const handleToggle = (id) => {
        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleAdd();
        }
    };

    return (
        <div className="todo-list">
            <h2>Todo List</h2>
            
            <div className="todo-input">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a new task..."
                />
                <button onClick={handleAdd}>Add</button>
            </div>
            
            <ul className="todo-items">
                {todos.length === 0 ? (
                    <li className="empty-state">No tasks yet. Add one above!</li>
                ) : (
                    todos.map(todo => (
                        <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                            <input
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => handleToggle(todo.id)}
                            />
                            <span className="todo-text">{todo.text}</span>
                            <button
                                className="delete-button"
                                onClick={() => handleDelete(todo.id)}
                                aria-label="Delete task"
                            >
                                ×
                            </button>
                        </li>
                    ))
                )}
            </ul>
            
            <div className="todo-stats">
                Total: {todos.length} | 
                Completed: {todos.filter(t => t.completed).length} | 
                Pending: {todos.filter(t => !t.completed).length}
            </div>
        </div>
    );
}

export default TodoList;
```

### CSS

```css
.todo-list {
    max-width: 500px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.todo-input {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.todo-input input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

.todo-input button {
    padding: 0.75rem 1.5rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.todo-items {
    list-style: none;
    padding: 0;
    margin: 0;
}

.todo-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: #f9f9f9;
    border-radius: 4px;
    transition: background 0.2s;
}

.todo-item:hover {
    background: #f0f0f0;
}

.todo-item.completed .todo-text {
    text-decoration: line-through;
    color: #999;
}

.todo-text {
    flex: 1;
}

.delete-button {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
}

.todo-stats {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
    font-size: 0.9rem;
    color: #666;
}
```

### Explanation
- **CRUD Operations**: Create (add), Read (display), Delete tasks
- **State Management**: Array of todo objects with unique IDs
- **Input Handling**: Controlled input with Enter key support
- **Toggle Completion**: Checkbox to mark tasks complete
- **Empty State**: Shows message when no tasks
- **Statistics**: Shows count of total/completed/pending tasks

### Visualization
```
┌─────────────────────────┐
│ Todo List               │
├─────────────────────────┤
│ [Add task...] [Add]     │
├─────────────────────────┤
│ ☑ Buy groceries         │
│ ☐ Walk the dog          │
│ ☐ Finish project        │
├─────────────────────────┤
│ Total: 3 | Completed: 1 │
└─────────────────────────┘
```

---

## 4. Star Rating

### Question
Build a star rating component that shows a row of star icons for users to select the number of filled stars corresponding to the rating.

### Solution

```jsx
import React, { useState } from 'react';

function StarRating({ maxStars = 5, initialRating = 0, onRatingChange }) {
    const [rating, setRating] = useState(initialRating);
    const [hoverRating, setHoverRating] = useState(0);

    const handleClick = (value) => {
        setRating(value);
        if (onRatingChange) {
            onRatingChange(value);
        }
    };

    const handleMouseEnter = (value) => {
        setHoverRating(value);
    };

    const handleMouseLeave = () => {
        setHoverRating(0);
    };

    return (
        <div className="star-rating">
            <div className="stars">
                {Array.from({ length: maxStars }, (_, index) => {
                    const starValue = index + 1;
                    const isFilled = starValue <= (hoverRating || rating);
                    
                    return (
                        <span
                            key={index}
                            className={`star ${isFilled ? 'filled' : 'empty'}`}
                            onClick={() => handleClick(starValue)}
                            onMouseEnter={() => handleMouseEnter(starValue)}
                            onMouseLeave={handleMouseLeave}
                            role="button"
                            tabIndex={0}
                            aria-label={`Rate ${starValue} out of ${maxStars}`}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleClick(starValue);
                                }
                            }}
                        >
                            ★
                        </span>
                    );
                })}
            </div>
            {rating > 0 && (
                <span className="rating-text">
                    {rating} out of {maxStars} stars
                </span>
            )}
        </div>
    );
}

// Usage
function App() {
    const handleRatingChange = (rating) => {
        console.log('Rating changed:', rating);
    };

    return (
        <div>
            <StarRating
                maxStars={5}
                initialRating={0}
                onRatingChange={handleRatingChange}
            />
        </div>
    );
}
```

### CSS

```css
.star-rating {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.stars {
    display: flex;
    gap: 0.25rem;
}

.star {
    font-size: 2rem;
    color: #ddd;
    cursor: pointer;
    transition: color 0.2s, transform 0.1s;
    user-select: none;
}

.star:hover {
    transform: scale(1.1);
}

.star.filled {
    color: #ffc107;
}

.star.empty {
    color: #ddd;
}

.rating-text {
    font-size: 0.9rem;
    color: #666;
}
```

### Explanation
- **Interactive Stars**: Click to set rating
- **Hover Effect**: Shows preview of rating on hover
- **Visual Feedback**: Filled stars in gold, empty in gray
- **Accessibility**: Keyboard navigation and ARIA labels
- **Callback**: Notifies parent of rating changes

### CSS Property Explained: `user-select: none`

> **What it does:** Prevents users from selecting/highlighting text when clicking or dragging

**In Star Rating Context (Line 686):**
```css
.star {
    user-select: none;  /* Prevents text selection */
}
```

**Why it's needed:**
- When users click stars rapidly, the browser might try to select the star text (★)
- This creates an ugly blue highlight that looks broken
- `user-select: none` prevents this unwanted text selection

**Visual Example:**

```
❌ Without user-select: none
Click star → [★★★★★] (text gets selected/highlighted in blue)

✅ With user-select: none  
Click star → ★★★★★ (no text selection, clean interaction)
```

**Other Values:**
- `user-select: auto` - Default browser behavior (text can be selected)
- `user-select: text` - Text can be selected
- `user-select: all` - Entire element selected with one click
- `user-select: none` - Text cannot be selected

**Common Use Cases:**
- Buttons and interactive elements (like stars)
- Drag-and-drop interfaces
- Custom UI controls
- Game interfaces
- Anything where text selection would interfere with interaction


### Visualization
```
★★★★★ 5 out of 5 stars

On hover:
★★★★☆ (hovering over 4)
```

---

## Key Patterns

1. **Controlled Components**: All inputs controlled by state
2. **Event Handling**: onClick, onChange, onKeyPress
3. **Conditional Rendering**: Show/hide based on state
4. **Array Operations**: map, filter for list rendering
5. **Accessibility**: ARIA attributes, keyboard support
6. **Animations**: CSS transitions and keyframes
7. **Portal Pattern**: Modal renders outside main tree

## Best Practices

- ✅ Use unique keys for list items
- ✅ Handle edge cases (empty states)
- ✅ Provide visual feedback
- ✅ Make components accessible
- ✅ Use semantic HTML
- ✅ Optimize re-renders with proper keys

