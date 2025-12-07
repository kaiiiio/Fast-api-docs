# DOM Manipulation: Working with the Document Object Model

The DOM (Document Object Model) represents HTML documents as a tree of nodes. Understanding DOM manipulation is essential for frontend development.

## What is the DOM?

**DOM** is a tree structure representing HTML documents. Each element is a node.

### DOM Tree Structure

```html
<html>
  <head>
    <title>Page</title>
  </head>
  <body>
    <div id="app">
      <h1>Hello</h1>
      <p>World</p>
    </div>
  </body>
</html>
```

**DOM Tree:**
```
Document
└── html
    ├── head
    │   └── title
    │       └── "Page"
    └── body
        └── div#app
            ├── h1
            │   └── "Hello"
            └── p
                └── "World"
```

## DOM Manipulation

### Selecting Elements

```javascript
// getElementById
const element = document.getElementById('app');

// querySelector
const element = document.querySelector('#app');
const elements = document.querySelectorAll('.item');

// getElementsByClassName
const elements = document.getElementsByClassName('item');

// getElementsByTagName
const divs = document.getElementsByTagName('div');
```

### Creating Elements

```javascript
// Create element
const div = document.createElement('div');
div.textContent = 'Hello World';
div.className = 'container';

// Append to DOM
document.body.appendChild(div);
```

### Modifying Elements

```javascript
// Modify text
element.textContent = 'New text';
element.innerHTML = '<strong>Bold</strong>';

// Modify attributes
element.setAttribute('id', 'new-id');
element.id = 'new-id';
element.className = 'new-class';

// Modify styles
element.style.color = 'red';
element.style.backgroundColor = 'blue';
```

### Removing Elements

```javascript
// Remove element
element.remove();

// Remove child
parent.removeChild(child);
```

## Real-World Examples

### Example 1: Dynamic List

```javascript
function createListItem(text) {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = 'list-item';
    
    const button = document.createElement('button');
    button.textContent = 'Delete';
    button.onclick = () => li.remove();
    
    li.appendChild(button);
    return li;
}

function addItem(text) {
    const list = document.getElementById('list');
    const item = createListItem(text);
    list.appendChild(item);
}
```

## Best Practices

1. **Use querySelector**: Modern API
2. **Batch Updates**: Update DOM in batches
3. **Document Fragment**: For multiple inserts
4. **Event Delegation**: Delegate events
5. **Performance**: Minimize DOM operations

## Summary

**DOM Manipulation:**

1. **Selection**: querySelector, getElementById
2. **Creation**: createElement, appendChild
3. **Modification**: textContent, innerHTML, attributes
4. **Removal**: remove(), removeChild()
5. **Best Practice**: Batch updates, use fragments

**Key Takeaway:**
DOM manipulation allows programmatic control of HTML. Use querySelector for selection. Create elements with createElement. Modify with textContent, innerHTML, attributes. Remove with remove(). Batch updates for performance. Use document fragments for multiple inserts.

**DOM Strategy:**
- Use modern APIs
- Batch updates
- Use fragments
- Event delegation
- Minimize operations

**Next Steps:**
- Learn [Event System](event_system.md) for interactions
- Study [Rendering Pipeline](rendering_pipeline.md) for performance
- Master [CSSOM](cssom_cascade.md) for styling

---

## 🎯 Interview Questions: Frontend

### Q1: Explain the DOM (Document Object Model) in detail, including its structure, how it's created from HTML, and how DOM manipulation works. Provide examples showing efficient DOM manipulation techniques and explain performance considerations.

**Answer:**

**DOM Definition:**

The Document Object Model (DOM) is a programming interface for HTML and XML documents. It represents the document as a tree structure where each node is an object representing a part of the document. The DOM provides a way to programmatically access, manipulate, and update the structure, style, and content of documents.

**How DOM is Created:**

**Parsing Process:**
```
1. HTML String → Parser → DOM Tree
2. Browser receives HTML
3. HTML parser parses HTML string
4. Creates DOM nodes for each element
5. Builds tree structure
6. DOM ready for manipulation
```

**DOM Tree Structure:**

**HTML:**
```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <div id="app">
      <h1>Hello</h1>
      <p>World</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    </div>
  </body>
</html>
```

**DOM Tree:**
```
Document (root)
└── html
    ├── head
    │   └── title
    │       └── Text: "My Page"
    └── body
        └── div#app
            ├── h1
            │   └── Text: "Hello"
            ├── p
            │   └── Text: "World"
            └── ul
                ├── li
                │   └── Text: "Item 1"
                └── li
                    └── Text: "Item 2"
```

**Node Types:**
- **Element Node**: HTML elements (`<div>`, `<p>`, etc.)
- **Text Node**: Text content
- **Attribute Node**: Element attributes
- **Comment Node**: HTML comments
- **Document Node**: Root document

**DOM Manipulation Methods:**

**1. Selecting Elements:**

**Modern Methods:**
```javascript
// querySelector: Returns first matching element
const element = document.querySelector('#app');
const element = document.querySelector('.container');
const element = document.querySelector('div.container');

// querySelectorAll: Returns NodeList of all matches
const elements = document.querySelectorAll('.item');
const elements = document.querySelectorAll('li.item');

// getElementById: Fast, direct access
const element = document.getElementById('app');

// getElementsByClassName: Returns HTMLCollection
const elements = document.getElementsByClassName('item');

// getElementsByTagName: Returns HTMLCollection
const divs = document.getElementsByTagName('div');
```

**Performance:**
- `getElementById`: Fastest (direct hash lookup)
- `querySelector`: Fast (uses CSS selector engine)
- `querySelectorAll`: Fast (returns static NodeList)
- `getElementsByClassName/TagName`: Fast (returns live HTMLCollection)

**2. Creating Elements:**

**Basic Creation:**
```javascript
// Create element
const div = document.createElement('div');
div.textContent = 'Hello World';
div.className = 'container';
div.id = 'my-div';

// Set attributes
div.setAttribute('data-id', '123');
div.setAttribute('aria-label', 'Container');

// Set styles
div.style.color = 'red';
div.style.backgroundColor = 'blue';
div.style.padding = '10px';
```

**3. Modifying Elements:**

**Text Content:**
```javascript
// textContent: Plain text (recommended)
element.textContent = 'New text';
// Escapes HTML, safe from XSS

// innerHTML: HTML content
element.innerHTML = '<strong>Bold</strong>';
// Parses HTML, potential XSS risk

// innerText: Visible text only
element.innerText = 'Visible text';
// Respects CSS visibility
```

**Attributes:**
```javascript
// Set attribute
element.setAttribute('id', 'new-id');
element.setAttribute('class', 'new-class');
element.setAttribute('data-custom', 'value');

// Get attribute
const id = element.getAttribute('id');
const custom = element.getAttribute('data-custom');

// Remove attribute
element.removeAttribute('id');

// Direct property access
element.id = 'new-id';
element.className = 'new-class';
element.href = 'https://example.com';
```

**4. Adding/Removing Elements:**

**Adding:**
```javascript
// appendChild: Add to end
parent.appendChild(child);

// insertBefore: Insert at specific position
parent.insertBefore(newChild, referenceChild);

// insertAdjacentHTML: Insert HTML string
element.insertAdjacentHTML('beforeend', '<p>New</p>');
// Positions: 'beforebegin', 'afterbegin', 'beforeend', 'afterend'

// replaceChild: Replace element
parent.replaceChild(newChild, oldChild);
```

**Removing:**
```javascript
// remove: Modern method
element.remove();

// removeChild: Traditional method
parent.removeChild(child);
```

**Performance Optimization:**

**1. Batch DOM Updates:**

**Inefficient:**
```javascript
// ❌ Bad: Multiple reflows
for (let i = 0; i < 1000; i++) {
    const div = document.createElement('div');
    div.textContent = `Item ${i}`;
    container.appendChild(div);  // Reflow each time!
}
// 1000 reflows = Very slow!
```

**Efficient:**
```javascript
// ✅ Good: Batch updates
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
    const div = document.createElement('div');
    div.textContent = `Item ${i}`;
    fragment.appendChild(div);  // No reflow
}
container.appendChild(fragment);  // Single reflow
// 1 reflow = Fast!
```

**2. Minimize DOM Queries:**

**Inefficient:**
```javascript
// ❌ Bad: Query DOM multiple times
for (let i = 0; i < 100; i++) {
    const element = document.querySelector('.item');  // Query each time
    element.textContent = `Item ${i}`;
}
```

**Efficient:**
```javascript
// ✅ Good: Query once
const element = document.querySelector('.item');
for (let i = 0; i < 100; i++) {
    element.textContent = `Item ${i}`;
}
```

**3. Use Document Fragments:**

**Example:**
```javascript
// Create fragment
const fragment = document.createDocumentFragment();

// Add multiple elements to fragment
for (let i = 0; i < 100; i++) {
    const li = document.createElement('li');
    li.textContent = `Item ${i}`;
    fragment.appendChild(li);
}

// Append fragment to DOM (single operation)
document.getElementById('list').appendChild(fragment);
// Single reflow instead of 100!
```

**4. Clone Nodes for Similar Elements:**
```javascript
// Create template
const template = document.createElement('div');
template.className = 'item';
template.innerHTML = '<span class="name"></span><span class="price"></span>';

// Clone for each item
const items = data.map(item => {
    const clone = template.cloneNode(true);  // Deep clone
    clone.querySelector('.name').textContent = item.name;
    clone.querySelector('.price').textContent = item.price;
    return clone;
});

// Append all at once
const fragment = document.createDocumentFragment();
items.forEach(item => fragment.appendChild(item));
container.appendChild(fragment);
```

**Real-World Example: Dynamic List**

**Efficient Implementation:**
```javascript
class DynamicList {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.items = [];
    }
    
    addItem(text) {
        // Create fragment for batch updates
        const fragment = document.createDocumentFragment();
        
        const li = document.createElement('li');
        li.className = 'list-item';
        li.textContent = text;
        
        const button = document.createElement('button');
        button.textContent = 'Delete';
        button.onclick = () => this.removeItem(li);
        
        li.appendChild(button);
        fragment.appendChild(li);
        
        // Single DOM update
        this.container.appendChild(fragment);
        this.items.push(li);
    }
    
    removeItem(item) {
        item.remove();
        this.items = this.items.filter(i => i !== item);
    }
    
    clear() {
        // Remove all at once
        this.items.forEach(item => item.remove());
        this.items = [];
    }
    
    updateItems(newItems) {
        // Efficient bulk update
        const fragment = document.createDocumentFragment();
        
        newItems.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            fragment.appendChild(li);
        });
        
        // Clear and update in one operation
        this.clear();
        this.container.appendChild(fragment);
    }
}
```

**Performance Considerations:**

**1. Reflow and Repaint:**

**Reflow (Layout):**
- Occurs when layout changes
- Expensive operation
- Triggered by: size changes, DOM additions/removals, style changes

**Repaint:**
- Occurs when visual changes
- Less expensive than reflow
- Triggered by: color changes, visibility changes

**Minimize Reflows:**
```javascript
// ❌ Bad: Multiple reflows
element.style.width = '100px';
element.style.height = '100px';
element.style.margin = '10px';

// ✅ Good: Single reflow
element.style.cssText = 'width: 100px; height: 100px; margin: 10px;';
// Or use classes
element.className = 'sized-element';
```

**2. Virtual DOM Concept:**

**Why Virtual DOM Helps:**
- Batch DOM updates
- Calculate minimal changes
- Apply changes efficiently
- Reduce reflows/repaints

**System Design Consideration**: DOM manipulation is fundamental for:
1. **Interactivity**: Dynamic user interfaces
2. **Performance**: Efficient updates
3. **User Experience**: Responsive applications
4. **Maintainability**: Clean, organized code

The DOM is the interface between JavaScript and HTML. Efficient DOM manipulation requires batching updates, using document fragments, minimizing queries, and understanding reflow/repaint. Modern frameworks use Virtual DOM to optimize updates, but understanding native DOM manipulation is essential for performance optimization and debugging.

---

### Q2: Explain the performance implications of DOM manipulation, including reflow and repaint, and provide techniques to minimize them. Discuss when to use different DOM manipulation methods and best practices for efficient DOM updates.

**Answer:**

**Reflow and Repaint:**

**Reflow (Layout Recalculation):**
Reflow is the process of recalculating the positions and geometries of elements in the document. It's triggered when the layout of the page changes, requiring the browser to recalculate element positions.

**What Triggers Reflow:**
- Adding/removing DOM elements
- Changing element dimensions (width, height, padding, margin)
- Changing element position (top, left, position)
- Changing content (text changes that affect layout)
- Window resize
- Font changes
- Reading layout properties (offsetWidth, scrollTop, etc.)

**Repaint (Visual Update):**
Repaint is the process of redrawing elements that have changed visually but don't affect layout. It's less expensive than reflow but still has performance cost.

**What Triggers Repaint:**
- Color changes
- Background changes
- Visibility changes
- Border style changes
- Outline changes

**Performance Impact:**

**Reflow Cost:**
```
Simple reflow: ~1-5ms
Complex reflow: ~10-50ms
Multiple reflows: Cumulative cost
100 reflows: ~100-500ms (noticeable delay!)
```

**Example: Inefficient DOM Updates**

**Multiple Reflows:**
```javascript
// ❌ Bad: Triggers 100 reflows
const container = document.getElementById('container');
for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.textContent = `Item ${i}`;
    div.style.width = '100px';
    div.style.height = '50px';
    container.appendChild(div);  // Reflow each time!
}
// Time: ~500ms (100 reflows)
```

**Optimized: Batch Updates**
```javascript
// ✅ Good: Single reflow
const container = document.getElementById('container');
const fragment = document.createDocumentFragment();

for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.textContent = `Item ${i}`;
    div.style.width = '100px';
    div.style.height = '50px';
    fragment.appendChild(div);  // No reflow
}

container.appendChild(fragment);  // Single reflow
// Time: ~5ms (1 reflow)
// 100x faster!
```

**Techniques to Minimize Reflow:**

**1. Batch DOM Reads and Writes:**

**Problem: Reading Layout Properties:**
```javascript
// ❌ Bad: Forces reflow
const width = element.offsetWidth;  // Read: Forces reflow
element.style.width = width + 10 + 'px';  // Write: Reflow
const height = element.offsetHeight;  // Read: Forces reflow again
element.style.height = height + 10 + 'px';  // Write: Reflow again
// 4 reflows!
```

**Solution: Batch Reads, Then Writes:**
```javascript
// ✅ Good: Batch operations
// Read all layout properties first
const width = element.offsetWidth;
const height = element.offsetHeight;

// Then write all changes
element.style.width = width + 10 + 'px';
element.style.height = height + 10 + 'px';
// 2 reflows (read batch, write batch)
```

**2. Use Document Fragments:**

**Example:**
```javascript
// Create fragment
const fragment = document.createDocumentFragment();

// Build DOM in memory
for (let i = 0; i < 1000; i++) {
    const li = document.createElement('li');
    li.textContent = `Item ${i}`;
    fragment.appendChild(li);  // No reflow
}

// Append once
document.getElementById('list').appendChild(fragment);
// Single reflow!
```

**3. Use CSS Classes Instead of Inline Styles:**
```javascript
// ❌ Bad: Multiple style changes
element.style.width = '100px';
element.style.height = '100px';
element.style.backgroundColor = 'blue';
element.style.color = 'white';
// Multiple reflows

// ✅ Good: Single class change
element.className = 'styled-element';
// CSS: .styled-element { width: 100px; height: 100px; background: blue; color: white; }
// Single reflow!
```

**4. Hide Elements During Updates:**
```javascript
// Hide element
element.style.display = 'none';

// Make multiple changes
element.style.width = '200px';
element.style.height = '200px';
element.appendChild(newChild);

// Show element
element.style.display = 'block';
// Only 2 reflows (hide, show) instead of many!
```

**5. Use requestAnimationFrame:**
```javascript
// Batch updates in animation frame
function updateElements() {
    requestAnimationFrame(() => {
        // All DOM updates in one frame
        element1.style.width = '100px';
        element2.style.height = '200px';
        element3.appendChild(newChild);
        // Browser optimizes and batches
    });
}
```

**Best Practices:**

**1. Minimize DOM Queries:**
```javascript
// ❌ Bad: Query multiple times
for (let i = 0; i < 100; i++) {
    const element = document.querySelector('.item');
    element.textContent = `Item ${i}`;
}

// ✅ Good: Query once
const element = document.querySelector('.item');
for (let i = 0; i < 100; i++) {
    element.textContent = `Item ${i}`;
}
```

**2. Use Efficient Selectors:**
```javascript
// ✅ Fast: ID selector
document.getElementById('app');

// ✅ Fast: Class selector
document.querySelector('.container');

// ⚠️ Slower: Complex selectors
document.querySelector('div.container > ul li:first-child');
```

**3. Cache DOM References:**
```javascript
// Cache frequently accessed elements
const app = document.getElementById('app');
const header = document.querySelector('.header');
const list = document.querySelector('.list');

// Reuse cached references
function updateApp() {
    app.appendChild(newElement);
}

function updateHeader() {
    header.textContent = 'New Title';
}
```

**4. Use Event Delegation:**
```javascript
// ❌ Bad: Many event listeners
document.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', handleClick);
});

// ✅ Good: Single delegated listener
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.classList.contains('item')) {
        handleClick(e);
    }
});
```

**System Design Consideration**: DOM performance is crucial for:
1. **User Experience**: Smooth, responsive interfaces
2. **Performance**: Fast page interactions
3. **Scalability**: Handling large DOM trees
4. **Battery Life**: Efficient rendering on mobile

DOM manipulation performance is critical for user experience. Understanding reflow and repaint helps optimize updates. Techniques like batching, using fragments, and minimizing layout reads significantly improve performance. Always measure and optimize DOM operations for large-scale applications.

