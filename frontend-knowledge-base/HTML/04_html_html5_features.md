# HTML5 Features - Interview Questions & Answers

## Q31. What are HTML5 Semantic Elements? List them.

**Answer:**

HTML5 introduced semantic elements that clearly describe their meaning:

```html
<header>     <!-- Page/section header -->
<nav>        <!-- Navigation links -->
<main>       <!-- Main content (one per page) -->
<article>    <!-- Independent content -->
<section>    <!-- Thematic grouping -->
<aside>      <!-- Sidebar content -->
<footer>     <!-- Page/section footer -->
<figure>     <!-- Self-contained content -->
<figcaption> <!-- Caption for figure -->
<time>       <!-- Date/time -->
<mark>       <!-- Highlighted text -->
<details>    <!-- Disclosure widget -->
<summary>    <!-- Summary for details -->
<dialog>     <!-- Dialog box -->
```

**Example Structure:**
```html
<header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
        </ul>
    </nav>
</header>

<main>
    <article>
        <h1>Article Title</h1>
        <time datetime="2024-01-15">January 15, 2024</time>
        <p>Article content...</p>
        
        <figure>
            <img src="chart.jpg" alt="Sales Chart">
            <figcaption>Q4 Sales Performance</figcaption>
        </figure>
    </article>
    
    <aside>
        <h3>Related Articles</h3>
        <ul>...</ul>
    </aside>
</main>

<footer>
    <p>&copy; 2024 Company Name</p>
</footer>
```

---

## Q32. What are HTML5 Form Validation Attributes?

**Answer:**

HTML5 provides built-in form validation without JavaScript:

```html
<form>
    <!-- Required field -->
    <input type="text" name="username" required>
    
    <!-- Min/Max length -->
    <input type="text" minlength="3" maxlength="20">
    
    <!-- Pattern (regex) -->
    <input type="text" pattern="[A-Za-z]{3,}" 
           title="Only letters, minimum 3">
    
    <!-- Number range -->
    <input type="number" min="1" max="100" step="5">
    
    <!-- Email validation -->
    <input type="email" required>
    
    <!-- URL validation -->
    <input type="url" required>
    
    <!-- Custom validation message -->
    <input type="text" required 
           oninvalid="this.setCustomValidity('Please enter your name')"
           oninput="this.setCustomValidity('')">
    
    <button type="submit">Submit</button>
</form>
```

**JavaScript Validation API:**
```javascript
const input = document.querySelector('input');

// Check validity
if (input.checkValidity()) {
    console.log('Valid');
} else {
    console.log('Invalid:', input.validationMessage);
}

// Custom validation
input.setCustomValidity('Custom error message');

// Validity states
console.log(input.validity.valueMissing);  // required field empty
console.log(input.validity.typeMismatch);  // wrong type (email, url)
console.log(input.validity.patternMismatch); // doesn't match pattern
console.log(input.validity.tooLong);       // exceeds maxlength
console.log(input.validity.tooShort);      // below minlength
console.log(input.validity.rangeOverflow); // exceeds max
console.log(input.validity.rangeUnderflow); // below min
console.log(input.validity.stepMismatch);  // doesn't match step
console.log(input.validity.valid);         // overall validity
```

---

## Q33. What is the `<video>` and `<audio>` element?

**Answer:**

HTML5 provides native media playback without plugins.

### Video Element:
```html
<video width="640" height="360" controls poster="thumbnail.jpg">
    <source src="video.mp4" type="video/mp4">
    <source src="video.webm" type="video/webm">
    <source src="video.ogg" type="video/ogg">
    <track src="subtitles-en.vtt" kind="subtitles" srclang="en" label="English">
    <track src="subtitles-es.vtt" kind="subtitles" srclang="es" label="Spanish">
    Your browser doesn't support video.
</video>
```

### Audio Element:
```html
<audio controls loop autoplay muted>
    <source src="audio.mp3" type="audio/mpeg">
    <source src="audio.ogg" type="audio/ogg">
    <source src="audio.wav" type="audio/wav">
    Your browser doesn't support audio.
</audio>
```

### Attributes:
- `controls` - Show playback controls
- `autoplay` - Start automatically
- `loop` - Repeat playback
- `muted` - Mute audio
- `preload` - `none`, `metadata`, `auto`
- `poster` - Thumbnail image (video only)

### JavaScript Control:
```javascript
const video = document.querySelector('video');

// Play/Pause
video.play();
video.pause();

// Properties
video.currentTime = 30;  // Seek to 30 seconds
video.volume = 0.5;      // 50% volume
video.playbackRate = 1.5; // 1.5x speed

// Events
video.addEventListener('play', () => console.log('Playing'));
video.addEventListener('pause', () => console.log('Paused'));
video.addEventListener('ended', () => console.log('Ended'));
video.addEventListener('timeupdate', () => {
    console.log('Current time:', video.currentTime);
});
video.addEventListener('loadedmetadata', () => {
    console.log('Duration:', video.duration);
});
```

---

## Q34. What is the `<iframe>` element? When to use it?

**Answer:**

`<iframe>` embeds another HTML page within the current page.

```html
<iframe 
    src="https://example.com" 
    width="800" 
    height="600"
    title="Example Website"
    sandbox="allow-scripts allow-same-origin"
    loading="lazy"
></iframe>
```

### Attributes:
- `src` - URL to embed
- `width`, `height` - Dimensions
- `title` - Accessibility description
- `sandbox` - Security restrictions
- `allow` - Feature policy
- `loading` - `lazy` or `eager`
- `name` - Target name for links

### Sandbox Values:
```html
<iframe sandbox="
    allow-forms
    allow-scripts
    allow-same-origin
    allow-popups
    allow-modals
    allow-downloads
"></iframe>
```

### Use Cases:
- Embed YouTube videos
- Embed Google Maps
- Third-party widgets
- Isolated content
- Ads

### Security Concerns:
- Clickjacking attacks
- Data theft
- XSS vulnerabilities

**Protection:**
```html
<!-- Prevent clickjacking -->
<iframe sandbox="allow-scripts" src="..."></iframe>

<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'">
```

---

## Q35. What are Data URLs and Blob URLs?

**Answer:**

### Data URLs:
Embed small files directly in HTML/CSS using base64 encoding.

```html
<!-- Inline image -->
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..." alt="Red dot">

<!-- Inline CSS -->
<link rel="stylesheet" href="data:text/css;base64,Ym9keXtiYWNrZ3JvdW5kOmJsdWV9">

<!-- Inline JavaScript -->
<script src="data:text/javascript;base64,Y29uc29sZS5sb2coJ0hlbGxvJyk="></script>
```

**Creating Data URLs:**
```javascript
// From canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 100, 100);
const dataURL = canvas.toDataURL('image/png');

// From file
const reader = new FileReader();
reader.onload = (e) => {
    const dataURL = e.target.result;
    img.src = dataURL;
};
reader.readAsDataURL(file);
```

### Blob URLs:
Temporary URLs for binary data.

```javascript
// Create blob
const blob = new Blob(['Hello World'], { type: 'text/plain' });
const blobURL = URL.createObjectURL(blob);

// Use blob URL
const link = document.createElement('a');
link.href = blobURL;
link.download = 'hello.txt';
link.click();

// Clean up (important!)
URL.revokeObjectURL(blobURL);

// From file
const file = input.files[0];
const blobURL = URL.createObjectURL(file);
img.src = blobURL;
```

### Comparison:

| Feature | Data URL | Blob URL |
|---------|----------|----------|
| **Format** | base64 encoded | blob:http://... |
| **Size** | Larger (33% overhead) | Original size |
| **Lifetime** | Permanent | Until revoked |
| **Use Case** | Small files, CSS sprites | Large files, downloads |
| **Memory** | Inline in HTML | Separate object |

---

## Q36. What is the `<template>` element?

**Answer:**

`<template>` holds HTML that is not rendered until activated by JavaScript.

```html
<template id="card-template">
    <div class="card">
        <h3 class="title"></h3>
        <p class="description"></p>
        <button>Click Me</button>
    </div>
</template>

<div id="container"></div>

<script>
const template = document.getElementById('card-template');
const container = document.getElementById('container');

// Clone and use template
const clone = template.content.cloneNode(true);
clone.querySelector('.title').textContent = 'Card Title';
clone.querySelector('.description').textContent = 'Description';
container.appendChild(clone);
</script>
```

**Benefits:**
- Not rendered initially (better performance)
- Can be cloned multiple times
- Content is inert (scripts don't run, images don't load)
- Useful for Web Components

---

## Q37. What is the History API?

**Answer:**

The History API allows manipulation of browser history without page reload.

```javascript
// Add entry to history
history.pushState({ page: 1 }, 'Title', '/page1');

// Replace current entry
history.replaceState({ page: 2 }, 'Title', '/page2');

// Navigate
history.back();     // Go back
history.forward();  // Go forward
history.go(-2);     // Go back 2 pages
history.go(1);      // Go forward 1 page

// Listen for navigation
window.addEventListener('popstate', (event) => {
    console.log('State:', event.state);
    // Load content based on state
});
```

**SPA Routing Example:**
```javascript
function navigate(url, state) {
    history.pushState(state, '', url);
    loadContent(url);
}

window.addEventListener('popstate', (event) => {
    loadContent(location.pathname);
});

// Intercept link clicks
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        navigate(e.target.href, { page: e.target.pathname });
    }
});
```

---

## Q38. What is the Fetch API?

**Answer:**

Modern API for making HTTP requests (replaces XMLHttpRequest).

```javascript
// Basic GET request
fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));

// POST request
fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        name: 'John',
        email: 'john@example.com'
    })
})
.then(response => response.json())
.then(data => console.log(data));

// With async/await
async function fetchData() {
    try {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Response methods
response.json()      // Parse as JSON
response.text()      // Get as text
response.blob()      // Get as Blob
response.arrayBuffer() // Get as ArrayBuffer
response.formData()  // Get as FormData

// Check response
response.ok          // true if status 200-299
response.status      // HTTP status code
response.statusText  // Status message
response.headers     // Headers object
```

---

## Q39. What is the Page Visibility API?

**Answer:**

Detects when page is visible or hidden (tab switching).

```javascript
// Check if page is visible
if (document.hidden) {
    console.log('Page is hidden');
} else {
    console.log('Page is visible');
}

// Listen for visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause video, stop animations
        video.pause();
    } else {
        // Resume video, restart animations
        video.play();
    }
});

// Visibility state
console.log(document.visibilityState);
// 'visible', 'hidden', 'prerender'
```

**Use Cases:**
- Pause videos when tab hidden
- Stop animations
- Pause games
- Reduce API calls
- Analytics

---

## Q40. What are Progressive Web Apps (PWA) features in HTML5?

**Answer:**

PWAs use HTML5 features to provide app-like experience.

### Service Worker:
```javascript
// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered', reg))
        .catch(err => console.log('SW error', err));
}
```

### Web App Manifest:
```html
<link rel="manifest" href="/manifest.json">
```

```json
{
  "name": "My PWA",
  "short_name": "PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Install Prompt:
```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('User choice:', outcome);
    deferredPrompt = null;
});
```

### Notification API:
```javascript
// Request permission
Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
        new Notification('Hello!', {
            body: 'This is a notification',
            icon: '/icon.png'
        });
    }
});
```

**PWA Features:**
- Offline support
- Push notifications
- Add to home screen
- Background sync
- App-like experience

---

## Summary

HTML5 introduced powerful features including semantic elements, form validation, media elements, APIs for storage, geolocation, and capabilities that enable Progressive Web Apps.
