# HTML Advanced - Interview Questions & Answers

## Q21. What is the HTML5 `<canvas>` element? How is it used?

**Answer:**

The `<canvas>` element is used to draw graphics on a web page using JavaScript. It provides a drawable region defined in HTML code with height and width attributes.

### Basic Setup:
```html
<canvas id="myCanvas" width="500" height="300"></canvas>

<script>
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// Now you can draw
ctx.fillStyle = 'blue';
ctx.fillRect(10, 10, 150, 100);
</script>
```

### Drawing Shapes:

**Rectangle:**
```javascript
// Filled rectangle
ctx.fillStyle = 'red';
ctx.fillRect(x, y, width, height);

// Stroked rectangle
ctx.strokeStyle = 'blue';
ctx.strokeRect(x, y, width, height);

// Clear rectangle
ctx.clearRect(x, y, width, height);
```

**Circle:**
```javascript
ctx.beginPath();
ctx.arc(x, y, radius, startAngle, endAngle);
ctx.fillStyle = 'green';
ctx.fill();
ctx.stroke();
```

**Line:**
```javascript
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.strokeStyle = 'black';
ctx.lineWidth = 2;
ctx.stroke();
```

**Path:**
```javascript
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(150, 50);
ctx.lineTo(100, 150);
ctx.closePath();
ctx.fillStyle = 'purple';
ctx.fill();
```

### Drawing Text:
```javascript
// Filled text
ctx.font = '30px Arial';
ctx.fillStyle = 'black';
ctx.fillText('Hello Canvas', 50, 50);

// Stroked text
ctx.strokeText('Hello Canvas', 50, 100);

// Text alignment
ctx.textAlign = 'center';  // left, right, center, start, end
ctx.textBaseline = 'middle';  // top, middle, bottom, alphabetic
```

### Drawing Images:
```javascript
const img = new Image();
img.src = 'image.jpg';
img.onload = function() {
    // Draw entire image
    ctx.drawImage(img, x, y);
    
    // Draw scaled image
    ctx.drawImage(img, x, y, width, height);
    
    // Draw cropped and scaled image
    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
};
```

### Gradients:
```javascript
// Linear gradient
const linearGrad = ctx.createLinearGradient(x0, y0, x1, y1);
linearGrad.addColorStop(0, 'red');
linearGrad.addColorStop(0.5, 'yellow');
linearGrad.addColorStop(1, 'blue');
ctx.fillStyle = linearGrad;
ctx.fillRect(0, 0, 200, 100);

// Radial gradient
const radialGrad = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
radialGrad.addColorStop(0, 'white');
radialGrad.addColorStop(1, 'black');
ctx.fillStyle = radialGrad;
ctx.fillRect(0, 0, 200, 200);
```

### Transformations:
```javascript
// Translate (move origin)
ctx.translate(x, y);

// Rotate (in radians)
ctx.rotate(angle);

// Scale
ctx.scale(scaleX, scaleY);

// Save and restore state
ctx.save();
ctx.translate(100, 100);
ctx.rotate(Math.PI / 4);
ctx.fillRect(0, 0, 50, 50);
ctx.restore();  // Back to original state
```

### Use Cases:
- Charts and graphs
- Games
- Image manipulation
- Data visualization
- Animations
- Drawing applications
- Signature capture

---

## Q22. What is the difference between `<canvas>` and `<svg>`?

**Answer:**

Both are used for graphics, but they work differently.

### Comparison Table:

| Feature | `<canvas>` | `<svg>` |
|---------|-----------|---------|
| **Type** | Raster (pixel-based) | Vector (shape-based) |
| **Rendering** | Immediate mode | Retained mode |
| **DOM** | Single element | Each shape is DOM element |
| **Scalability** | Loses quality when scaled | Scales without quality loss |
| **Performance** | Better for many objects | Better for few objects |
| **Interactivity** | Manual event handling | Built-in event handlers |
| **Modification** | Redraw everything | Modify individual elements |
| **File Size** | Smaller for complex scenes | Larger for complex scenes |
| **Best For** | Games, pixel manipulation | Icons, logos, charts |

### Canvas Example:
```html
<canvas id="canvas" width="200" height="200"></canvas>

<script>
const ctx = document.getElementById('canvas').getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);

// To change: must clear and redraw
ctx.clearRect(0, 0, 200, 200);
ctx.fillStyle = 'blue';
ctx.fillRect(50, 50, 100, 100);
</script>
```

### SVG Example:
```html
<svg width="200" height="200">
    <rect id="myRect" x="50" y="50" width="100" height="100" fill="red"/>
</svg>

<script>
// Can directly modify element
document.getElementById('myRect').setAttribute('fill', 'blue');
</script>
```

### When to Use Canvas:
- High-performance games
- Many objects (thousands)
- Pixel manipulation
- Real-time rendering
- Complex animations

### When to Use SVG:
- Logos and icons
- Interactive charts
- Responsive graphics
- Accessibility important
- Need to style with CSS
- Few objects with interactivity

---

## Q23. What are HTML5 Web Storage APIs? Explain localStorage and sessionStorage.

**Answer:**

Web Storage provides a way to store data in the browser. It's more secure and faster than cookies.

### localStorage:
- Data persists **permanently** (until manually deleted)
- Shared across all tabs/windows of same origin
- Storage limit: ~5-10MB

```javascript
// Set item
localStorage.setItem('username', 'John');
localStorage.setItem('theme', 'dark');

// Get item
const username = localStorage.getItem('username');  // "John"

// Remove item
localStorage.removeItem('username');

// Clear all
localStorage.clear();

// Check if key exists
if (localStorage.getItem('theme')) {
    console.log('Theme exists');
}

// Store objects (must stringify)
const user = { name: 'John', age: 30 };
localStorage.setItem('user', JSON.stringify(user));

// Retrieve objects (must parse)
const retrievedUser = JSON.parse(localStorage.getItem('user'));

// Get number of items
console.log(localStorage.length);

// Get key by index
const key = localStorage.key(0);

// Iterate over all items
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(key, value);
}
```

### sessionStorage:
- Data persists **only for the session** (until tab/window closes)
- Separate for each tab/window
- Storage limit: ~5-10MB

```javascript
// Same API as localStorage
sessionStorage.setItem('tempData', 'value');
const data = sessionStorage.getItem('tempData');
sessionStorage.removeItem('tempData');
sessionStorage.clear();
```

### Comparison with Cookies:

| Feature | localStorage | sessionStorage | Cookies |
|---------|--------------|----------------|---------|
| **Lifetime** | Permanent | Session | Configurable |
| **Capacity** | ~5-10MB | ~5-10MB | ~4KB |
| **Sent to Server** | No | No | Yes (every request) |
| **Accessibility** | Client-side only | Client-side only | Client & server |
| **Scope** | All tabs | Single tab | All tabs |

### Storage Event:
```javascript
// Listen for storage changes (only fires in other tabs)
window.addEventListener('storage', (e) => {
    console.log('Key:', e.key);
    console.log('Old Value:', e.oldValue);
    console.log('New Value:', e.newValue);
    console.log('URL:', e.url);
    console.log('Storage Area:', e.storageArea);
});
```

### Practical Examples:

**1. Theme Preference:**
```javascript
// Save theme
function setTheme(theme) {
    localStorage.setItem('theme', theme);
    document.body.className = theme;
}

// Load theme on page load
window.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('theme') || 'light';
    setTheme(theme);
});
```

**2. Form Data Persistence:**
```javascript
// Save form data
document.getElementById('myForm').addEventListener('input', (e) => {
    localStorage.setItem(e.target.name, e.target.value);
});

// Restore form data
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input').forEach(input => {
        const saved = localStorage.getItem(input.name);
        if (saved) input.value = saved;
    });
});
```

**3. Shopping Cart:**
```javascript
// Add to cart
function addToCart(item) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Get cart
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

// Clear cart
function clearCart() {
    localStorage.removeItem('cart');
}
```

### Best Practices:
- Always use try-catch (storage can be full or disabled)
- Don't store sensitive data (not encrypted)
- Stringify objects before storing
- Check for storage support before using
- Clean up old data periodically

```javascript
// Check support
if (typeof(Storage) !== 'undefined') {
    // Storage supported
} else {
    // No storage support
}

// Safe storage wrapper
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.error('Storage failed:', e);
        return false;
    }
}
```

---

## Q24. What is the HTML5 Geolocation API?

**Answer:**

The Geolocation API allows web applications to access the user's geographical location (with permission).

### Basic Usage:
```javascript
if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        options
    );
} else {
    console.log('Geolocation not supported');
}
```

### Get Current Position:
```javascript
function successCallback(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;  // meters
    const altitude = position.coords.altitude;  // meters (may be null)
    const altitudeAccuracy = position.coords.altitudeAccuracy;
    const heading = position.coords.heading;  // degrees (may be null)
    const speed = position.coords.speed;  // meters/second (may be null)
    const timestamp = position.timestamp;
    
    console.log(`Lat: ${latitude}, Lon: ${longitude}`);
    console.log(`Accuracy: ${accuracy} meters`);
}

function errorCallback(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            console.log('User denied geolocation');
            break;
        case error.POSITION_UNAVAILABLE:
            console.log('Location unavailable');
            break;
        case error.TIMEOUT:
            console.log('Request timeout');
            break;
        default:
            console.log('Unknown error');
    }
}

const options = {
    enableHighAccuracy: true,  // Use GPS if available
    timeout: 5000,             // Max wait time (ms)
    maximumAge: 0              // Don't use cached position
};

navigator.geolocation.getCurrentPosition(
    successCallback,
    errorCallback,
    options
);
```

### Watch Position (Continuous Tracking):
```javascript
const watchId = navigator.geolocation.watchPosition(
    (position) => {
        console.log('New position:', position.coords);
    },
    (error) => {
        console.error('Error:', error);
    },
    {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000
    }
);

// Stop watching
navigator.geolocation.clearWatch(watchId);
```

### Practical Example - Show on Map:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Geolocation Demo</title>
</head>
<body>
    <button id="getLocation">Get My Location</button>
    <div id="result"></div>
    <div id="map"></div>
    
    <script>
        document.getElementById('getLocation').addEventListener('click', () => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        document.getElementById('result').innerHTML = `
                            <p>Latitude: ${lat}</p>
                            <p>Longitude: ${lon}</p>
                            <p>Accuracy: ${position.coords.accuracy} meters</p>
                        `;
                        
                        // Show on Google Maps
                        const mapUrl = `https://www.google.com/maps?q=${lat},${lon}`;
                        document.getElementById('map').innerHTML = `
                            <a href="${mapUrl}" target="_blank">View on Google Maps</a>
                        `;
                    },
                    (error) => {
                        document.getElementById('result').innerHTML = 
                            `<p>Error: ${error.message}</p>`;
                    }
                );
            } else {
                alert('Geolocation not supported');
            }
        });
    </script>
</body>
</html>
```

### Use Cases:
- Store locators
- Weather apps
- Navigation apps
- Location-based services
- Delivery tracking
- Social media check-ins

### Privacy & Security:
- Requires HTTPS (except localhost)
- User must grant permission
- Permission can be revoked anytime
- Don't store location without consent
- Inform users why you need location

---

## Q25. What are Web Workers in HTML5?

**Answer:**

**Web Workers** allow JavaScript to run in background threads, preventing UI blocking for heavy computations.

### Why Use Web Workers?
- JavaScript is single-threaded
- Heavy operations block UI
- Workers run in separate thread
- Don't block user interface

### Creating a Web Worker:

**Main Script (main.js):**
```javascript
// Check support
if (typeof(Worker) !== 'undefined') {
    // Create worker
    const worker = new Worker('worker.js');
    
    // Send message to worker
    worker.postMessage({ data: 'Hello Worker' });
    
    // Receive message from worker
    worker.onmessage = function(event) {
        console.log('Received from worker:', event.data);
    };
    
    // Handle errors
    worker.onerror = function(error) {
        console.error('Worker error:', error.message);
    };
    
    // Terminate worker
    worker.terminate();
} else {
    console.log('Web Workers not supported');
}
```

**Worker Script (worker.js):**
```javascript
// Listen for messages from main thread
self.onmessage = function(event) {
    console.log('Received in worker:', event.data);
    
    // Do heavy computation
    const result = performHeavyTask(event.data);
    
    // Send result back to main thread
    self.postMessage(result);
};

function performHeavyTask(data) {
    // Heavy computation here
    let result = 0;
    for (let i = 0; i < 1000000000; i++) {
        result += i;
    }
    return result;
}
```

### Practical Example - Prime Number Calculator:

**HTML:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Web Worker Demo</title>
</head>
<body>
    <input type="number" id="number" placeholder="Enter number">
    <button id="calculate">Calculate Primes</button>
    <button id="stop">Stop</button>
    <div id="result"></div>
    <p>UI is not blocked - try clicking buttons!</p>
    
    <script src="main.js"></script>
</body>
</html>
```

**main.js:**
```javascript
let worker;

document.getElementById('calculate').addEventListener('click', () => {
    const number = document.getElementById('number').value;
    
    // Create worker
    worker = new Worker('prime-worker.js');
    
    // Send number to worker
    worker.postMessage(number);
    
    // Receive result
    worker.onmessage = function(event) {
        document.getElementById('result').innerHTML = 
            `Found ${event.data.count} prime numbers up to ${number}`;
    };
    
    // Handle errors
    worker.onerror = function(error) {
        document.getElementById('result').innerHTML = 
            `Error: ${error.message}`;
    };
});

document.getElementById('stop').addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        document.getElementById('result').innerHTML = 'Calculation stopped';
    }
});
```

**prime-worker.js:**
```javascript
self.onmessage = function(event) {
    const max = parseInt(event.data);
    const primes = [];
    
    for (let num = 2; num <= max; num++) {
        let isPrime = true;
        for (let i = 2; i <= Math.sqrt(num); i++) {
            if (num % i === 0) {
                isPrime = false;
                break;
            }
        }
        if (isPrime) {
            primes.push(num);
        }
        
        // Send progress updates
        if (num % 10000 === 0) {
            self.postMessage({ 
                type: 'progress', 
                current: num, 
                max: max 
            });
        }
    }
    
    // Send final result
    self.postMessage({ 
        type: 'complete', 
        count: primes.length,
        primes: primes 
    });
};
```

### Worker Limitations:
- ❌ Cannot access DOM
- ❌ Cannot access `window` object
- ❌ Cannot access `document` object
- ❌ Cannot access parent page variables
- ✅ Can use `XMLHttpRequest`
- ✅ Can use `fetch()`
- ✅ Can use timers (`setTimeout`, `setInterval`)
- ✅ Can import scripts (`importScripts()`)

### Importing Scripts in Worker:
```javascript
// worker.js
importScripts('script1.js', 'script2.js', 'library.js');

// Now can use functions from imported scripts
```

### Shared Workers:
```javascript
// Multiple tabs can share same worker
const sharedWorker = new SharedWorker('shared-worker.js');

sharedWorker.port.start();

sharedWorker.port.postMessage('Hello');

sharedWorker.port.onmessage = function(event) {
    console.log(event.data);
};
```

### Use Cases:
- Image processing
- Video encoding
- Large data parsing
- Complex calculations
- Encryption/decryption
- Real-time data processing
- Background sync

---

## Q26. What is the HTML5 Drag and Drop API?

**Answer:**

The Drag and Drop API allows users to drag elements and drop them in different locations.

### Making an Element Draggable:
```html
<div draggable="true" id="drag1">Drag me!</div>
```

### Drag Events:

**On Draggable Element:**
- `dragstart` - User starts dragging
- `drag` - Element is being dragged
- `dragend` - Drag operation ends

**On Drop Target:**
- `dragenter` - Dragged element enters target
- `dragover` - Dragged element is over target
- `dragleave` - Dragged element leaves target
- `drop` - Element is dropped on target

### Complete Example:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .draggable {
            width: 100px;
            height: 100px;
            background: lightblue;
            margin: 10px;
            cursor: move;
        }
        
        .dropzone {
            width: 300px;
            height: 200px;
            border: 2px dashed #ccc;
            margin: 10px;
            padding: 10px;
        }
        
        .dropzone.dragover {
            border-color: green;
            background: lightgreen;
        }
    </style>
</head>
<body>
    <div class="draggable" draggable="true" id="item1">Item 1</div>
    <div class="draggable" draggable="true" id="item2">Item 2</div>
    
    <div class="dropzone" id="zone1">Drop Zone 1</div>
    <div class="dropzone" id="zone2">Drop Zone 2</div>
    
    <script>
        // Get all draggable elements
        const draggables = document.querySelectorAll('.draggable');
        const dropzones = document.querySelectorAll('.dropzone');
        
        // Drag start
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.id);
                e.dataTransfer.effectAllowed = 'move';
                e.target.style.opacity = '0.5';
            });
            
            draggable.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
            });
        });
        
        // Drop zones
        dropzones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();  // Allow drop
                e.dataTransfer.dropEffect = 'move';
                zone.classList.add('dragover');
            });
            
            zone.addEventListener('dragenter', (e) => {
                e.preventDefault();
            });
            
            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('dragover');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                
                // Get dragged element
                const id = e.dataTransfer.getData('text/plain');
                const draggable = document.getElementById(id);
                
                // Append to drop zone
                zone.appendChild(draggable);
            });
        });
    </script>
</body>
</html>
```

### DataTransfer Object:

```javascript
dragstart event => {
    // Set data
    e.dataTransfer.setData('text/plain', 'some data');
    e.dataTransfer.setData('text/html', '<p>HTML data</p>');
    e.dataTransfer.setData('application/json', JSON.stringify(obj));
    
    // Set drag image
    const img = new Image();
    img.src = 'icon.png';
    e.dataTransfer.setDragImage(img, 10, 10);
    
    // Set effect
    e.dataTransfer.effectAllowed = 'move';  // copy, move, link, all
};

drop event => {
    // Get data
    const data = e.dataTransfer.getData('text/plain');
    
    // Get files (if dragging files)
    const files = e.dataTransfer.files;
    for (let file of files) {
        console.log(file.name, file.size, file.type);
    }
};
```

### File Upload with Drag & Drop:

```html
<div id="dropArea">
    Drop files here
</div>
<div id="fileList"></div>

<script>
const dropArea = document.getElementById('dropArea');

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.background = 'lightblue';
});

dropArea.addEventListener('dragleave', (e) => {
    dropArea.style.background = '';
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.background = '';
    
    const files = e.dataTransfer.files;
    handleFiles(files);
});

function handleFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    for (let file of files) {
        const div = document.createElement('div');
        div.textContent = `${file.name} (${file.size} bytes)`;
        fileList.appendChild(div);
        
        // Upload file
        uploadFile(file);
    }
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => console.log('Uploaded:', data))
    .catch(error => console.error('Error:', error));
}
</script>
```

### Use Cases:
- File uploads
- Sortable lists
- Kanban boards
- Image galleries
- Form builders
- Dashboard widgets

---

## Q27. What is the `<picture>` element and responsive images?

**Answer:**

The `<picture>` element provides responsive images, allowing different images for different screen sizes, resolutions, or formats.

### Basic Syntax:
```html
<picture>
    <source media="(min-width: 1200px)" srcset="large.jpg">
    <source media="(min-width: 768px)" srcset="medium.jpg">
    <source media="(min-width: 480px)" srcset="small.jpg">
    <img src="default.jpg" alt="Description">
</picture>
```

### Art Direction (Different Images):
```html
<picture>
    <!-- Desktop: landscape image -->
    <source media="(min-width: 1024px)" srcset="landscape.jpg">
    
    <!-- Tablet: square image -->
    <source media="(min-width: 768px)" srcset="square.jpg">
    
    <!-- Mobile: portrait image -->
    <source media="(min-width: 320px)" srcset="portrait.jpg">
    
    <!-- Fallback -->
    <img src="default.jpg" alt="Responsive image">
</picture>
```

### Modern Image Formats:
```html
<picture>
    <!-- WebP for browsers that support it -->
    <source type="image/webp" srcset="image.webp">
    
    <!-- AVIF for even better compression -->
    <source type="image/avif" srcset="image.avif">
    
    <!-- Fallback to JPEG -->
    <img src="image.jpg" alt="Image">
</picture>
```

### Resolution Switching (Retina Displays):
```html
<picture>
    <source 
        srcset="image-1x.jpg 1x, image-2x.jpg 2x, image-3x.jpg 3x"
        media="(min-width: 768px)"
    >
    <img src="image-1x.jpg" alt="High DPI image">
</picture>
```

### Combining Multiple Conditions:
```html
<picture>
    <!-- Large screen, WebP, 2x resolution -->
    <source 
        media="(min-width: 1200px)"
        type="image/webp"
        srcset="large-1x.webp 1x, large-2x.webp 2x"
    >
    
    <!-- Large screen, JPEG, 2x resolution -->
    <source 
        media="(min-width: 1200px)"
        srcset="large-1x.jpg 1x, large-2x.jpg 2x"
    >
    
    <!-- Medium screen, WebP -->
    <source 
        media="(min-width: 768px)"
        type="image/webp"
        srcset="medium.webp"
    >
    
    <!-- Medium screen, JPEG -->
    <source 
        media="(min-width: 768px)"
        srcset="medium.jpg"
    >
    
    <!-- Fallback -->
    <img src="small.jpg" alt="Responsive image">
</picture>
```

### `srcset` and `sizes` on `<img>`:

```html
<!-- Let browser choose based on screen width -->
<img 
    srcset="small.jpg 480w,
            medium.jpg 768w,
            large.jpg 1200w"
    sizes="(max-width: 480px) 100vw,
           (max-width: 768px) 50vw,
           33vw"
    src="medium.jpg"
    alt="Responsive image"
>
```

**Explanation:**
- `480w`, `768w`, `1200w` = image widths in pixels
- `sizes` tells browser how much space image will take
- Browser chooses best image based on screen size and DPI

### Lazy Loading:
```html
<picture>
    <source media="(min-width: 768px)" srcset="large.jpg">
    <img src="small.jpg" alt="Lazy loaded" loading="lazy">
</picture>
```

### Benefits:
- **Performance**: Smaller images for mobile
- **Bandwidth**: Save data on mobile devices
- **Art Direction**: Different crops for different screens
- **Format Support**: Modern formats with fallbacks
- **Retina Support**: High-DPI displays get sharp images

### Best Practices:
```html
<picture>
    <!-- Always include type for format detection -->
    <source type="image/webp" srcset="image.webp">
    
    <!-- Always include media queries in order (largest first) -->
    <source media="(min-width: 1200px)" srcset="large.jpg">
    <source media="(min-width: 768px)" srcset="medium.jpg">
    
    <!-- Always include <img> as fallback -->
    <img src="small.jpg" alt="Always include alt text">
</picture>
```

---

## Q28. What are Custom Elements and Web Components?

**Answer:**

**Web Components** are a set of web platform APIs that allow you to create reusable custom elements with encapsulated functionality.

### Three Main Technologies:

1. **Custom Elements** - Define new HTML elements
2. **Shadow DOM** - Encapsulated DOM and styles
3. **HTML Templates** - Reusable markup

### Creating a Custom Element:

```javascript
// Define custom element class
class MyButton extends HTMLElement {
    constructor() {
        super();
        
        // Attach shadow DOM
        this.attachShadow({ mode: 'open' });
        
        // Create template
        this.shadowRoot.innerHTML = `
            <style>
                button {
                    background: blue;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
                button:hover {
                    background: darkblue;
                }
            </style>
            <button>
                <slot></slot>
            </button>
        `;
    }
    
    // Lifecycle callbacks
    connectedCallback() {
        console.log('Element added to page');
        this.shadowRoot.querySelector('button').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('myclick', {
                detail: { message: 'Button clicked!' }
            }));
        });
    }
    
    disconnectedCallback() {
        console.log('Element removed from page');
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
    }
    
    static get observedAttributes() {
        return ['color', 'size'];
    }
}

// Register custom element
customElements.define('my-button', MyButton);
```

### Using the Custom Element:

```html
<my-button>Click Me</my-button>

<script>
document.querySelector('my-button').addEventListener('myclick', (e) => {
    console.log(e.detail.message);
});
</script>
```

### Complete Example - User Card:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Web Components Demo</title>
</head>
<body>
    <user-card 
        name="John Doe" 
        email="john@example.com"
        avatar="avatar.jpg"
    ></user-card>
    
    <script>
        class UserCard extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            
            connectedCallback() {
                const name = this.getAttribute('name');
                const email = this.getAttribute('email');
                const avatar = this.getAttribute('avatar');
                
                this.shadowRoot.innerHTML = `
                    <style>
                        .card {
                            border: 1px solid #ccc;
                            border-radius: 8px;
                            padding: 20px;
                            max-width: 300px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .avatar {
                            width: 80px;
                            height: 80px;
                            border-radius: 50%;
                            object-fit: cover;
                        }
                        .name {
                            font-size: 20px;
                            font-weight: bold;
                            margin: 10px 0 5px;
                        }
                        .email {
                            color: #666;
                            font-size: 14px;
                        }
                    </style>
                    <div class="card">
                        <img class="avatar" src="${avatar}" alt="${name}">
                        <div class="name">${name}</div>
                        <div class="email">${email}</div>
                    </div>
                `;
            }
            
            static get observedAttributes() {
                return ['name', 'email', 'avatar'];
            }
            
            attributeChangedCallback(name, oldValue, newValue) {
                if (oldValue !== newValue) {
                    this.connectedCallback();
                }
            }
        }
        
        customElements.define('user-card', UserCard);
    </script>
</body>
</html>
```

### Using `<template>` and `<slot>`:

```html
<template id="my-template">
    <style>
        .container {
            padding: 20px;
            border: 1px solid #ccc;
        }
    </style>
    <div class="container">
        <h2><slot name="title">Default Title</slot></h2>
        <p><slot name="content">Default content</slot></p>
        <slot></slot>
    </div>
</template>

<script>
class MyElement extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById('my-template');
        const content = template.content.cloneNode(true);
        
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(content);
    }
}

customElements.define('my-element', MyElement);
</script>

<!-- Usage -->
<my-element>
    <span slot="title">Custom Title</span>
    <span slot="content">Custom content here</span>
    <p>Additional content</p>
</my-element>
```

### Shadow DOM Modes:

```javascript
// Open: Accessible from outside
this.attachShadow({ mode: 'open' });
element.shadowRoot.querySelector('button');  // Works

// Closed: Not accessible from outside
this.attachShadow({ mode: 'closed' });
element.shadowRoot;  // null
```

### Benefits:
- **Encapsulation**: Styles don't leak out
- **Reusability**: Use anywhere
- **Maintainability**: Self-contained components
- **Native**: No framework needed
- **Interoperability**: Works with any framework

### Use Cases:
- Design systems
- Reusable UI components
- Third-party widgets
- Micro-frontends

---

## Q29. What is the Intersection Observer API?

**Answer:**

The **Intersection Observer API** provides a way to asynchronously observe changes in the intersection of a target element with an ancestor element or the viewport.

### Basic Usage:

```javascript
// Create observer
const observer = new IntersectionObserver(callback, options);

// Observe element
const target = document.querySelector('.target');
observer.observe(target);

// Callback function
function callback(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            console.log('Element is visible');
            // Do something
        } else {
            console.log('Element is not visible');
        }
    });
}

// Options
const options = {
    root: null,  // viewport (null) or specific element
    rootMargin: '0px',  // margin around root
    threshold: 0.5  // 50% visibility triggers callback
};
```

### Lazy Loading Images:

```html
<img data-src="image1.jpg" class="lazy" alt="Image 1">
<img data-src="image2.jpg" class="lazy" alt="Image 2">
<img data-src="image3.jpg" class="lazy" alt="Image 3">

<script>
const lazyImages = document.querySelectorAll('.lazy');

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);  // Stop observing
        }
    });
});

lazyImages.forEach(img => imageObserver.observe(img));
</script>
```

### Infinite Scroll:

```html
<div id="content">
    <!-- Content items -->
</div>
<div id="sentinel"></div>

<script>
const sentinel = document.getElementById('sentinel');
let page = 1;

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadMoreContent();
        }
    });
}, {
    rootMargin: '100px'  // Load before reaching bottom
});

scrollObserver.observe(sentinel);

function loadMoreContent() {
    fetch(`/api/content?page=${page}`)
        .then(response => response.json())
        .then(data => {
            appendContent(data);
            page++;
        });
}
</script>
```

### Animate on Scroll:

```html
<div class="fade-in">Content 1</div>
<div class="fade-in">Content 2</div>
<div class="fade-in">Content 3</div>

<style>
.fade-in {
    opacity: 0;
    transform: translateY(50px);
    transition: opacity 0.5s, transform 0.5s;
}

.fade-in.visible {
    opacity: 1;
    transform: translateY(0);
}
</style>

<script>
const fadeElements = document.querySelectorAll('.fade-in');

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.1
});

fadeElements.forEach(el => fadeObserver.observe(el));
</script>
```

### Entry Properties:

```javascript
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        console.log('isIntersecting:', entry.isIntersecting);
        console.log('intersectionRatio:', entry.intersectionRatio);
        console.log('intersectionRect:', entry.intersectionRect);
        console.log('boundingClientRect:', entry.boundingClientRect);
        console.log('rootBounds:', entry.rootBounds);
        console.log('target:', entry.target);
        console.log('time:', entry.time);
    });
});
```

### Multiple Thresholds:

```javascript
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        console.log(`${entry.intersectionRatio * 100}% visible`);
    });
}, {
    threshold: [0, 0.25, 0.5, 0.75, 1.0]
});
```

### Unobserve and Disconnect:

```javascript
// Stop observing specific element
observer.unobserve(element);

// Stop observing all elements
observer.disconnect();
```

### Use Cases:
- Lazy loading images/videos
- Infinite scroll
- Scroll animations
- Analytics (track visibility)
- Ad viewability
- Auto-play videos when visible

---

## Q30. What is the difference between `contenteditable` and form inputs?

**Answer:**

### `contenteditable` Attribute:

Makes any HTML element editable by the user.

```html
<div contenteditable="true">
    This text can be edited!
</div>

<p contenteditable="true">
    Edit this <strong>paragraph</strong> with <em>formatting</em>!
</p>
```

**Values:**
- `true` - Element is editable
- `false` - Element is not editable
- `inherit` - Inherits from parent

### Getting/Setting Content:

```javascript
const div = document.querySelector('[contenteditable]');

// Get content as HTML
const html = div.innerHTML;

// Get content as text
const text = div.textContent;

// Set content
div.innerHTML = '<strong>New content</strong>';

// Listen for changes
div.addEventListener('input', (e) => {
    console.log('Content changed:', e.target.innerHTML);
});

div.addEventListener('blur', (e) => {
    console.log('Editing finished');
});
```

### Rich Text Editor Example:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        #editor {
            border: 1px solid #ccc;
            min-height: 200px;
            padding: 10px;
        }
        .toolbar button {
            margin: 5px;
            padding: 5px 10px;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button onclick="format('bold')"><b>B</b></button>
        <button onclick="format('italic')"><i>I</i></button>
        <button onclick="format('underline')"><u>U</u></button>
        <button onclick="format('insertUnorderedList')">• List</button>
        <button onclick="format('insertOrderedList')">1. List</button>
        <button onclick="format('createLink')">Link</button>
    </div>
    
    <div id="editor" contenteditable="true">
        Start typing here...
    </div>
    
    <button onclick="getContent()">Get Content</button>
    
    <script>
        function format(command) {
            if (command === 'createLink') {
                const url = prompt('Enter URL:');
                document.execCommand(command, false, url);
            } else {
                document.execCommand(command, false, null);
            }
        }
        
        function getContent() {
            const editor = document.getElementById('editor');
            console.log('HTML:', editor.innerHTML);
            console.log('Text:', editor.textContent);
        }
        
        // Save content on change
        document.getElementById('editor').addEventListener('input', () => {
            localStorage.setItem('editorContent', editor.innerHTML);
        });
        
        // Load saved content
        window.addEventListener('DOMContentLoaded', () => {
            const saved = localStorage.getItem('editorContent');
            if (saved) {
                document.getElementById('editor').innerHTML = saved;
            }
        });
    </script>
</body>
</html>
```

### Comparison: `contenteditable` vs Form Inputs

| Feature | `contenteditable` | `<input>` / `<textarea>` |
|---------|-------------------|--------------------------|
| **Rich Text** | Yes (HTML formatting) | No (plain text only) |
| **Any Element** | Yes | No (specific elements) |
| **Form Submit** | No (not included) | Yes (automatically included) |
| **Validation** | No built-in | Yes (HTML5 validation) |
| **Placeholder** | No native support | Yes (`placeholder` attribute) |
| **Value Access** | `innerHTML` / `textContent` | `value` property |
| **Styling** | Full CSS control | Limited (form element constraints) |
| **Use Case** | Rich text editors, WYSIWYG | Forms, simple text input |

### Making contenteditable Submit with Form:

```html
<form id="myForm">
    <div id="editor" contenteditable="true">Edit me</div>
    <input type="hidden" name="content" id="hiddenContent">
    <button type="submit">Submit</button>
</form>

<script>
document.getElementById('myForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const content = document.getElementById('editor').innerHTML;
    document.getElementById('hiddenContent').value = content;
    
    // Now submit form
    e.target.submit();
});
</script>
```

### Security Considerations:

```javascript
// Sanitize user input to prevent XSS
function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;  // Escapes HTML
    return temp.innerHTML;
}

// Or use a library like DOMPurify
const clean = DOMPurify.sanitize(dirtyHTML);
```

### Use Cases:

**contenteditable:**
- Rich text editors
- WYSIWYG editors
- Inline editing
- Note-taking apps
- CMS content editing

**Form Inputs:**
- Login forms
- Search boxes
- Contact forms
- Simple text input
- Structured data entry

---

## Summary

These advanced HTML questions cover Canvas, SVG, Web Storage, Geolocation, Web Workers, Drag & Drop, responsive images, Web Components, Intersection Observer, and contenteditable - all essential modern HTML5 features for advanced frontend development.
