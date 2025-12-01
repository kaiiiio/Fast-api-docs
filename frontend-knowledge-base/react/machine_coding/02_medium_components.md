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

