# Event System: Capturing, Bubbling, and Delegation

Understanding the browser event system is crucial for handling user interactions efficiently.

## Event Phases

**Events** flow through three phases: capturing, target, and bubbling.

### Event Flow

```
┌─────────────────────────────────┐
│  Capture Phase (top → target)   │
├─────────────────────────────────┤
│  Target Phase (on element)      │
├─────────────────────────────────┤
│  Bubble Phase (target → top)    │
└─────────────────────────────────┘
```

### Example

```html
<div id="outer">
    <div id="inner">
        <button id="button">Click</button>
    </div>
</div>
```

```javascript
// Event flow: outer → inner → button → inner → outer

document.getElementById('outer').addEventListener('click', (e) => {
    console.log('Outer (capture)', e.eventPhase);  // 1 (CAPTURING_PHASE)
}, true);  // Capture phase

document.getElementById('inner').addEventListener('click', (e) => {
    console.log('Inner (bubble)', e.eventPhase);  // 3 (BUBBLING_PHASE)
}, false);  // Bubble phase

document.getElementById('button').addEventListener('click', (e) => {
    console.log('Button (target)', e.eventPhase);  // 2 (AT_TARGET)
});
```

## Event Delegation

**Event delegation** attaches event listeners to parent elements.

```javascript
// ❌ Bad: Attach to each element
document.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', handleClick);
});

// ✅ Good: Delegate to parent
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        handleClick(e);
    }
});
```

## Real-World Examples

### Example 1: Dynamic List with Delegation

```javascript
function addItem(text) {
    const list = document.getElementById('list');
    const item = document.createElement('li');
    item.className = 'item';
    item.textContent = text;
    list.appendChild(item);
}

// Single event listener for all items
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        console.log('Clicked:', e.target.textContent);
    }
});

// Add items dynamically - no need to attach listeners
addItem('Item 1');
addItem('Item 2');
```

## Best Practices

1. **Event Delegation**: Use for dynamic content
2. **Capture vs Bubble**: Understand phases
3. **Stop Propagation**: Use stopPropagation() carefully
4. **Prevent Default**: Use preventDefault() when needed
5. **Performance**: Delegate events for efficiency

## Summary

**Event System:**

1. **Phases**: Capture, target, bubble
2. **Delegation**: Attach to parent
3. **Best Practice**: Use delegation for dynamic content
4. **Performance**: Fewer listeners, better performance
5. **Use Cases**: Dynamic lists, tables, forms

**Key Takeaway:**
Events flow through capture, target, and bubble phases. Event delegation attaches listeners to parent elements, improving performance for dynamic content. Use delegation for lists, tables, and dynamic content. Understand when to use capture vs bubble phase.

**Event Strategy:**
- Use delegation
- Understand phases
- Stop propagation when needed
- Prevent default appropriately
- Optimize for performance

**Next Steps:**
- Learn [DOM Manipulation](dom_manipulation.md) for elements
- Study [Rendering Pipeline](rendering_pipeline.md) for performance
- Master [CSSOM](cssom_cascade.md) for styling

---

## 🎯 Interview Questions: Frontend

### Q1: Explain the browser event system in detail, including event phases (capturing, target, bubbling), event delegation, and how to use them efficiently. Provide examples showing when to use event delegation and its performance benefits.

**Answer:**

**Event System Overview:**

The browser event system handles user interactions (clicks, keyboard input, mouse movements, etc.) through a three-phase flow: capturing, target, and bubbling. Understanding this system is essential for efficient event handling and performance optimization.

**Event Phases:**

**1. Capture Phase (Top to Target):**
- Events flow from document root down to target element
- Event listeners with `capture: true` execute in this phase
- Used for intercepting events before they reach target

**2. Target Phase:**
- Event reaches the target element
- Event listeners on target element execute
- Can be in capture or bubble phase depending on listener

**3. Bubble Phase (Target to Top):**
- Events flow from target element up to document root
- Event listeners with `capture: false` (default) execute in this phase
- Most common phase for event handling

**Visual Event Flow:**

```
Event Flow for Click on Button:

Document (root)
  │
  ├─ Capture Phase (top → target)
  │  └─ div#outer (capture listener)
  │     └─ div#inner (capture listener)
  │        └─ button#btn (target)
  │
  ├─ Target Phase
  │  └─ button#btn (target listeners)
  │
  └─ Bubble Phase (target → top)
     └─ button#btn
        └─ div#inner (bubble listener)
           └─ div#outer (bubble listener)
              └─ Document (root)
```

**Example:**
```html
<div id="outer">
    <div id="inner">
        <button id="btn">Click Me</button>
    </div>
</div>
```

```javascript
// Capture phase listener
document.getElementById('outer').addEventListener('click', (e) => {
    console.log('Outer (capture)', e.eventPhase);  // 1 = CAPTURING_PHASE
}, true);  // capture: true

// Bubble phase listener
document.getElementById('inner').addEventListener('click', (e) => {
    console.log('Inner (bubble)', e.eventPhase);  // 3 = BUBBLING_PHASE
}, false);  // capture: false (default)

// Target phase listener
document.getElementById('btn').addEventListener('click', (e) => {
    console.log('Button (target)', e.eventPhase);  // 2 = AT_TARGET
});

// Click on button outputs:
// "Outer (capture)" - Capture phase
// "Button (target)" - Target phase
// "Inner (bubble)" - Bubble phase
```

**Event Delegation:**

**Definition:**
Event delegation attaches a single event listener to a parent element instead of attaching listeners to each child element. The parent handles events for all children based on event target.

**Why Use Event Delegation:**

**1. Performance:**
```javascript
// ❌ Bad: Many event listeners
const items = document.querySelectorAll('.item');
items.forEach(item => {
    item.addEventListener('click', handleClick);
});
// 1000 items = 1000 event listeners
// Memory: High
// Performance: Slower

// ✅ Good: Single delegated listener
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        handleClick(e);
    }
});
// 1000 items = 1 event listener
// Memory: Low
// Performance: Faster
```

**2. Dynamic Content:**
```javascript
// ❌ Bad: Must attach listener to each new element
function addItem(text) {
    const li = document.createElement('li');
    li.className = 'item';
    li.textContent = text;
    li.addEventListener('click', handleClick);  // Must attach each time
    list.appendChild(li);
}

// ✅ Good: Works automatically for new elements
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        handleClick(e);
    }
});

function addItem(text) {
    const li = document.createElement('li');
    li.className = 'item';
    li.textContent = text;
    list.appendChild(li);
    // No need to attach listener - delegation handles it!
}
```

**Event Delegation Implementation:**

**Basic Pattern:**
```javascript
// Attach listener to parent
document.getElementById('list').addEventListener('click', (e) => {
    // Check if clicked element matches selector
    if (e.target.classList.contains('item')) {
        // Handle event
        console.log('Clicked:', e.target.textContent);
    }
});
```

**Advanced Pattern with closest():**
```javascript
// Handle nested elements
document.getElementById('list').addEventListener('click', (e) => {
    // Find closest matching ancestor
    const item = e.target.closest('.item');
    if (item) {
        // Handle event on item (even if clicked on child)
        console.log('Clicked item:', item.textContent);
    }
});
```

**Example: Complex List with Buttons**
```html
<ul id="todo-list">
    <li class="todo-item">
        <span class="todo-text">Task 1</span>
        <button class="delete-btn">Delete</button>
        <button class="edit-btn">Edit</button>
    </li>
    <!-- More items -->
</ul>
```

```javascript
// Single delegated listener handles all interactions
document.getElementById('todo-list').addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    
    if (e.target.classList.contains('delete-btn')) {
        // Handle delete
        item.remove();
    } else if (e.target.classList.contains('edit-btn')) {
        // Handle edit
        const text = item.querySelector('.todo-text');
        text.contentEditable = true;
    } else if (e.target.classList.contains('todo-text')) {
        // Handle text click
        console.log('Text clicked:', e.target.textContent);
    }
});
```

**Performance Comparison:**

**Test Scenario:** 10,000 list items

**Direct Listeners:**
```javascript
// 10,000 event listeners
const items = document.querySelectorAll('.item');
items.forEach(item => {
    item.addEventListener('click', handleClick);
});

// Memory: ~10MB (10,000 listeners)
// Initialization: ~500ms
// Click handling: ~1ms per click
```

**Event Delegation:**
```javascript
// 1 event listener
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        handleClick(e);
    }
});

// Memory: ~1KB (1 listener)
// Initialization: ~1ms
// Click handling: ~1.1ms per click (slight overhead for target check)
// 100x less memory, 500x faster initialization!
```

**When to Use Event Delegation:**

**1. Dynamic Content:**
```javascript
// Items added/removed dynamically
// Delegation automatically handles new items
document.getElementById('list').addEventListener('click', handleItemClick);
```

**2. Many Similar Elements:**
```javascript
// Table with 1000 rows
// Single listener on table instead of 1000 on rows
document.getElementById('table').addEventListener('click', handleRowClick);
```

**3. Performance Critical:**
```javascript
// High-traffic interactions
// Fewer listeners = better performance
document.getElementById('container').addEventListener('click', handleAllClicks);
```

**When NOT to Use Event Delegation:**

**1. Unique Element Interactions:**
```javascript
// Single button, specific behavior
// Direct listener is simpler
document.getElementById('submit-btn').addEventListener('click', handleSubmit);
```

**2. Need to Stop Propagation:**
```javascript
// If you need precise control over event flow
// Direct listeners give more control
element.addEventListener('click', (e) => {
    e.stopPropagation();  // More predictable with direct listener
    handleClick(e);
});
```

**Event Object Properties:**

**Common Properties:**
```javascript
element.addEventListener('click', (e) => {
    e.target;           // Element that triggered event
    e.currentTarget;    // Element with listener (in delegation, parent)
    e.type;            // Event type ('click', 'keydown', etc.)
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop event bubbling
    e.stopImmediatePropagation(); // Stop all listeners
    e.eventPhase;      // 1=capture, 2=target, 3=bubble
});
```

**target vs currentTarget:**
```javascript
// In event delegation
document.getElementById('list').addEventListener('click', (e) => {
    console.log(e.target);        // Actual clicked element (li, button, etc.)
    console.log(e.currentTarget); // Element with listener (ul#list)
    
    // e.target might be a child element
    // e.currentTarget is always the element with the listener
});
```

**System Design Consideration**: Event handling is crucial for:
1. **Performance**: Efficient event management
2. **Memory**: Minimizing listener overhead
3. **Maintainability**: Clean, organized event handling
4. **User Experience**: Responsive interactions

The browser event system uses three phases (capture, target, bubble) to handle events. Event delegation is a powerful pattern that improves performance and simplifies handling dynamic content. Understanding event phases and delegation helps build efficient, maintainable frontend applications.

---

### Q2: Explain event delegation in detail, including how it works, when to use it, and its performance benefits. Provide examples showing how to implement event delegation for dynamic content and complex interactions.

**Answer:**

**Event Delegation Definition:**

Event delegation is a technique where instead of attaching event listeners to individual elements, you attach a single listener to a parent element that handles events for all its children. The parent uses the event's target property to determine which child element triggered the event.

**How Event Delegation Works:**

**Traditional Approach:**
```javascript
// ❌ Attach listener to each element
const items = document.querySelectorAll('.item');
items.forEach(item => {
    item.addEventListener('click', () => {
        console.log('Clicked:', item.textContent);
    });
});

// Problems:
// - 1000 items = 1000 listeners
// - New items need listeners attached
// - High memory usage
// - Slower initialization
```

**Delegation Approach:**
```javascript
// ✅ Attach single listener to parent
document.getElementById('list').addEventListener('click', (e) => {
    // Check if clicked element matches
    if (e.target.classList.contains('item')) {
        console.log('Clicked:', e.target.textContent);
    }
});

// Benefits:
// - 1000 items = 1 listener
// - New items work automatically
// - Low memory usage
// - Fast initialization
```

**Event Flow in Delegation:**

```
User clicks on <li class="item">Item 1</li>

Event Flow:
1. Click event fires on <li>
2. Event bubbles up to parent <ul id="list">
3. Listener on <ul> receives event
4. Check: e.target.classList.contains('item') → true
5. Handle event for that specific item
```

**Performance Benefits:**

**Memory Usage:**
```
Direct Listeners:
- 10,000 items × ~1KB per listener = ~10MB
- High memory footprint

Event Delegation:
- 1 listener × ~1KB = ~1KB
- 10,000x less memory!
```

**Initialization Time:**
```
Direct Listeners:
- Attach 10,000 listeners: ~500ms
- Slow page load

Event Delegation:
- Attach 1 listener: ~1ms
- 500x faster initialization!
```

**Dynamic Content Handling:**

**Problem with Direct Listeners:**
```javascript
// ❌ Problem: New items don't have listeners
function addItem(text) {
    const li = document.createElement('li');
    li.className = 'item';
    li.textContent = text;
    // Must attach listener each time
    li.addEventListener('click', handleClick);
    list.appendChild(li);
}

// If items added later, must remember to attach listeners
```

**Solution with Delegation:**
```javascript
// ✅ Solution: Works automatically
// Set up once
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        handleClick(e);
    }
});

// Add items anytime - no listener needed
function addItem(text) {
    const li = document.createElement('li');
    li.className = 'item';
    li.textContent = text;
    list.appendChild(li);
    // Automatically works - delegation handles it!
}
```

**Handling Nested Elements:**

**Problem: Clicking on Child Elements**
```html
<li class="item">
    <span class="text">Item 1</span>
    <button class="delete">Delete</button>
</li>
```

**Basic Delegation (May Not Work):**
```javascript
// ⚠️ Problem: Clicking button, e.target is button, not li
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        // Only works if clicking directly on li
        // Doesn't work if clicking on button or span
    }
});
```

**Solution: Use closest()**
```javascript
// ✅ Solution: Find closest matching ancestor
document.getElementById('list').addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (item) {
        // Works regardless of what child was clicked
        handleItemClick(item, e);
    }
    
    // Handle specific child clicks
    if (e.target.classList.contains('delete')) {
        e.stopPropagation();  // Prevent item click
        handleDelete(item);
    }
});
```

**Complex Example: Todo List**

**HTML:**
```html
<ul id="todo-list">
    <li class="todo-item" data-id="1">
        <input type="checkbox" class="todo-checkbox">
        <span class="todo-text">Task 1</span>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
    </li>
    <!-- More items -->
</ul>
```

**Event Delegation Implementation:**
```javascript
// Single listener handles all interactions
document.getElementById('todo-list').addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;  // Clicked outside items
    
    const itemId = item.dataset.id;
    
    // Handle checkbox
    if (e.target.classList.contains('todo-checkbox')) {
        const isCompleted = e.target.checked;
        updateTodoStatus(itemId, isCompleted);
        item.classList.toggle('completed', isCompleted);
    }
    
    // Handle edit button
    else if (e.target.classList.contains('edit-btn')) {
        const textElement = item.querySelector('.todo-text');
        textElement.contentEditable = true;
        textElement.focus();
    }
    
    // Handle delete button
    else if (e.target.classList.contains('delete-btn')) {
        deleteTodo(itemId);
        item.remove();
    }
    
    // Handle text click
    else if (e.target.classList.contains('todo-text')) {
        console.log('Text clicked:', e.target.textContent);
    }
    
    // Handle item click (anywhere else on item)
    else {
        console.log('Item clicked:', itemId);
    }
});
```

**Performance Comparison:**

**Test: 10,000 list items with click handlers**

**Direct Listeners:**
```javascript
const items = document.querySelectorAll('.item');
items.forEach(item => {
    item.addEventListener('click', handleClick);
});

// Metrics:
// Listeners: 10,000
// Memory: ~10MB
// Init time: ~500ms
// Click time: ~1ms
```

**Event Delegation:**
```javascript
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        handleClick(e);
    }
});

// Metrics:
// Listeners: 1
// Memory: ~1KB
// Init time: ~1ms
// Click time: ~1.1ms (slight overhead for target check)
// 10,000x less memory, 500x faster init!
```

**Best Practices:**

**1. Use closest() for Nested Elements:**
```javascript
// ✅ Always use closest() for reliable delegation
const item = e.target.closest('.item');
if (item) {
    handleItemClick(item);
}
```

**2. Check Early:**
```javascript
// ✅ Early return for performance
document.getElementById('list').addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (!item) return;  // Exit early if not an item
    
    // Handle item click
    handleItemClick(item);
});
```

**3. Use Data Attributes:**
```javascript
// ✅ Store data in data attributes
<li class="item" data-id="123" data-category="electronics">
    Item content
</li>

// Access in delegation
const itemId = item.dataset.id;
const category = item.dataset.category;
```

**4. Stop Propagation When Needed:**
```javascript
// ✅ Prevent parent handlers when needed
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        e.stopPropagation();  // Don't trigger item click
        handleDelete(e);
    }
});
```

**System Design Consideration**: Event delegation is essential for:
1. **Performance**: Reducing memory and initialization time
2. **Scalability**: Handling large numbers of elements
3. **Maintainability**: Simpler event management
4. **Dynamic Content**: Automatic handling of new elements

Event delegation is a powerful pattern that significantly improves performance and simplifies event handling for dynamic content. It reduces memory usage, speeds up initialization, and automatically handles new elements. Use delegation for lists, tables, and any scenario with many similar elements or dynamic content.

