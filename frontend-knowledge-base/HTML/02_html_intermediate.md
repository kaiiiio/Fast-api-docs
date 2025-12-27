# HTML Intermediate - Interview Questions & Answers

## Q11. What are the different types of lists in HTML?

**Answer:**

HTML provides three types of lists:

### 1. Unordered List (`<ul>`)
Displays items with bullet points (order doesn't matter)

```html
<ul>
    <li>Coffee</li>
    <li>Tea</li>
    <li>Milk</li>
</ul>
```

**CSS list-style-type:**
```css
ul { list-style-type: disc; }     /* Default: • */
ul { list-style-type: circle; }   /* ○ */
ul { list-style-type: square; }   /* ▪ */
ul { list-style-type: none; }     /* No marker */
```

### 2. Ordered List (`<ol>`)
Displays items with numbers (order matters)

```html
<ol>
    <li>First step</li>
    <li>Second step</li>
    <li>Third step</li>
</ol>
```

**Attributes:**
```html
<!-- Start from specific number -->
<ol start="5">
    <li>Item 5</li>
    <li>Item 6</li>
</ol>

<!-- Reverse order -->
<ol reversed>
    <li>Third</li>
    <li>Second</li>
    <li>First</li>
</ol>

<!-- Different numbering types -->
<ol type="1">  <!-- 1, 2, 3 (default) -->
<ol type="A">  <!-- A, B, C -->
<ol type="a">  <!-- a, b, c -->
<ol type="I">  <!-- I, II, III -->
<ol type="i">  <!-- i, ii, iii -->
```

### 3. Description List (`<dl>`)
Displays term-description pairs

```html
<dl>
    <dt>HTML</dt>
    <dd>HyperText Markup Language</dd>
    
    <dt>CSS</dt>
    <dd>Cascading Style Sheets</dd>
    
    <dt>JavaScript</dt>
    <dd>Programming language for web</dd>
</dl>
```

**Nested Lists:**
```html
<ul>
    <li>Frontend
        <ul>
            <li>HTML</li>
            <li>CSS</li>
            <li>JavaScript</li>
        </ul>
    </li>
    <li>Backend
        <ul>
            <li>Node.js</li>
            <li>Python</li>
        </ul>
    </li>
</ul>
```

---

## Q12. What are HTML forms? Explain form elements and attributes.

**Answer:**

HTML forms collect user input and send it to a server for processing.

### Basic Form Structure:
```html
<form action="/submit" method="POST">
    <!-- Form elements go here -->
    <button type="submit">Submit</button>
</form>
```

### Form Attributes:

| Attribute | Description | Values |
|-----------|-------------|--------|
| `action` | URL where form data is sent | URL or file path |
| `method` | HTTP method for sending data | `GET`, `POST` |
| `enctype` | How form data is encoded | `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain` |
| `target` | Where to display response | `_self`, `_blank`, `_parent`, `_top` |
| `autocomplete` | Browser autocomplete | `on`, `off` |
| `novalidate` | Skip validation | Boolean |

### Common Form Elements:

```html
<form action="/submit" method="POST">
    <!-- Text Input -->
    <label for="username">Username:</label>
    <input type="text" id="username" name="username" required>
    
    <!-- Password -->
    <label for="password">Password:</label>
    <input type="password" id="password" name="password" required>
    
    <!-- Email -->
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>
    
    <!-- Number -->
    <label for="age">Age:</label>
    <input type="number" id="age" name="age" min="18" max="100">
    
    <!-- Radio Buttons -->
    <label>Gender:</label>
    <input type="radio" id="male" name="gender" value="male">
    <label for="male">Male</label>
    <input type="radio" id="female" name="gender" value="female">
    <label for="female">Female</label>
    
    <!-- Checkbox -->
    <input type="checkbox" id="subscribe" name="subscribe" value="yes">
    <label for="subscribe">Subscribe to newsletter</label>
    
    <!-- Select Dropdown -->
    <label for="country">Country:</label>
    <select id="country" name="country">
        <option value="">Select...</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="in">India</option>
    </select>
    
    <!-- Textarea -->
    <label for="message">Message:</label>
    <textarea id="message" name="message" rows="4" cols="50"></textarea>
    
    <!-- File Upload -->
    <label for="file">Upload File:</label>
    <input type="file" id="file" name="file">
    
    <!-- Submit Button -->
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
</form>
```

### GET vs POST:

| Feature | GET | POST |
|---------|-----|------|
| **Data Visibility** | Visible in URL | Hidden in request body |
| **Security** | Less secure | More secure |
| **Data Length** | Limited (~2048 chars) | Unlimited |
| **Caching** | Can be cached | Not cached |
| **Bookmarking** | Can be bookmarked | Cannot be bookmarked |
| **Use Case** | Search, filters | Login, file upload, sensitive data |

---

## Q13. What are the different input types in HTML5?

**Answer:**

HTML5 introduced many new input types for better user experience and validation.

### Text-Based Inputs:
```html
<!-- Standard text -->
<input type="text" placeholder="Enter text">

<!-- Email (validates email format) -->
<input type="email" placeholder="email@example.com">

<!-- URL (validates URL format) -->
<input type="url" placeholder="https://example.com">

<!-- Telephone -->
<input type="tel" placeholder="+1-234-567-8900">

<!-- Search (may show clear button) -->
<input type="search" placeholder="Search...">

<!-- Password (hides characters) -->
<input type="password" placeholder="Password">
```

### Numeric Inputs:
```html
<!-- Number -->
<input type="number" min="0" max="100" step="5" value="10">

<!-- Range (slider) -->
<input type="range" min="0" max="100" step="10" value="50">
```

### Date & Time Inputs:
```html
<!-- Date picker -->
<input type="date" min="2024-01-01" max="2024-12-31">

<!-- Time picker -->
<input type="time" min="09:00" max="18:00">

<!-- Date and time -->
<input type="datetime-local">

<!-- Month picker -->
<input type="month">

<!-- Week picker -->
<input type="week">
```

### Selection Inputs:
```html
<!-- Color picker -->
<input type="color" value="#ff0000">

<!-- File upload -->
<input type="file" accept=".jpg,.png,.pdf" multiple>

<!-- Checkbox -->
<input type="checkbox" checked>

<!-- Radio button -->
<input type="radio" name="option" value="1">
```

### Button Inputs:
```html
<!-- Submit button -->
<input type="submit" value="Submit Form">

<!-- Reset button -->
<input type="reset" value="Reset Form">

<!-- Generic button -->
<input type="button" value="Click Me" onclick="alert('Clicked!')">

<!-- Image button -->
<input type="image" src="submit.png" alt="Submit">
```

### Hidden Input:
```html
<!-- Hidden field (not visible to user) -->
<input type="hidden" name="userId" value="12345">
```

### Input Attributes:
```html
<input 
    type="text"
    name="username"
    id="username"
    placeholder="Enter username"
    value="default value"
    required
    readonly
    disabled
    maxlength="20"
    minlength="3"
    pattern="[A-Za-z]{3,}"
    autocomplete="off"
    autofocus
>
```

---

## Q14. What is the difference between `<strong>` and `<b>`, `<em>` and `<i>`?

**Answer:**

### `<strong>` vs `<b>`:

**`<strong>` (Semantic)**
- Indicates **strong importance** or urgency
- Screen readers emphasize it
- SEO significance
- Semantic meaning

```html
<p><strong>Warning:</strong> This action cannot be undone.</p>
```

**`<b>` (Presentational)**
- Just makes text **bold** visually
- No semantic meaning
- No special treatment by screen readers
- Purely stylistic

```html
<p><b>Product Name:</b> XYZ Widget</p>
```

### `<em>` vs `<i>`:

**`<em>` (Semantic)**
- Indicates **emphasis** or stress
- Screen readers use different tone
- Changes meaning of sentence
- Semantic meaning

```html
<p>I <em>really</em> love this!</p>
<p>I really <em>love</em> this!</p>  <!-- Different emphasis -->
```

**`<i>` (Presentational)**
- Makes text *italic* visually
- No semantic meaning
- Used for technical terms, foreign words, thoughts
- Purely stylistic

```html
<p>The term <i>et cetera</i> is often abbreviated.</p>
<p><i>Homo sapiens</i> is the scientific name for humans.</p>
```

### Comparison Table:

| Element | Type | Meaning | Screen Reader | Use Case |
|---------|------|---------|---------------|----------|
| `<strong>` | Semantic | Strong importance | Emphasized | Warnings, important text |
| `<b>` | Presentational | Bold text | Normal | Keywords, product names |
| `<em>` | Semantic | Emphasis/stress | Different tone | Stressed words |
| `<i>` | Presentational | Italic text | Normal | Technical terms, foreign words |

### Best Practice:
```html
<!-- Good: Semantic -->
<p><strong>Error:</strong> Invalid input</p>
<p>This is <em>very</em> important</p>

<!-- Acceptable: Presentational -->
<p><b>Note:</b> See documentation</p>
<p>The word <i>renaissance</i> means rebirth</p>

<!-- Bad: Using for styling only -->
<b>Use CSS instead</b>
<i>Use CSS instead</i>
```

**CSS Alternative:**
```css
.bold { font-weight: bold; }
.italic { font-style: italic; }
```

---

## Q15. What is the purpose of the `<meta>` tag? Give examples.

**Answer:**

The `<meta>` tag provides metadata about the HTML document. Metadata is not displayed but is used by browsers, search engines, and other web services.

### Character Encoding:
```html
<!-- UTF-8 encoding (supports all languages) -->
<meta charset="UTF-8">
```

### Viewport (Responsive Design):
```html
<!-- Essential for mobile responsiveness -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### SEO Meta Tags:
```html
<!-- Page description (shown in search results) -->
<meta name="description" content="Learn HTML with comprehensive examples and tutorials">

<!-- Keywords (less important now) -->
<meta name="keywords" content="HTML, CSS, JavaScript, web development">

<!-- Author -->
<meta name="author" content="John Doe">

<!-- Robots (search engine crawling) -->
<meta name="robots" content="index, follow">
<meta name="robots" content="noindex, nofollow">
```

### Social Media Meta Tags:

**Open Graph (Facebook, LinkedIn):**
```html
<meta property="og:title" content="Amazing Article Title">
<meta property="og:description" content="Article description">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:url" content="https://example.com/article">
<meta property="og:type" content="article">
<meta property="og:site_name" content="My Website">
```

**Twitter Cards:**
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Amazing Article Title">
<meta name="twitter:description" content="Article description">
<meta name="twitter:image" content="https://example.com/image.jpg">
<meta name="twitter:creator" content="@username">
```

### HTTP Equivalent:
```html
<!-- Refresh page after 30 seconds -->
<meta http-equiv="refresh" content="30">

<!-- Redirect after 5 seconds -->
<meta http-equiv="refresh" content="5;url=https://example.com">

<!-- Content type -->
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">

<!-- IE compatibility mode -->
<meta http-equiv="X-UA-Compatible" content="IE=edge">
```

### Mobile App Meta Tags:
```html
<!-- iOS -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="App Title">

<!-- Android -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#4285f4">
```

### Security:
```html
<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

---

## Q16. What is the difference between `<link>` and `<a>` tags?

**Answer:**

### `<link>` Tag:
- Used in `<head>` section
- Links **external resources** to the document
- Not visible to users
- Doesn't create clickable links
- Self-closing tag

```html
<head>
    <!-- CSS stylesheet -->
    <link rel="stylesheet" href="styles.css">
    
    <!-- Favicon -->
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    
    <!-- Preconnect to external domain -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    
    <!-- Prefetch resource -->
    <link rel="prefetch" href="next-page.html">
    
    <!-- Canonical URL (SEO) -->
    <link rel="canonical" href="https://example.com/page">
    
    <!-- Alternate language version -->
    <link rel="alternate" hreflang="es" href="https://example.com/es/page">
    
    <!-- RSS feed -->
    <link rel="alternate" type="application/rss+xml" href="feed.xml">
</head>
```

### `<a>` Tag (Anchor):
- Used in `<body>` section
- Creates **clickable hyperlinks**
- Visible to users
- Navigates to other pages/sections
- Requires closing tag

```html
<body>
    <!-- External link -->
    <a href="https://example.com">Visit Example</a>
    
    <!-- Internal link -->
    <a href="/about">About Us</a>
    
    <!-- Email link -->
    <a href="mailto:email@example.com">Email Us</a>
    
    <!-- Phone link -->
    <a href="tel:+1234567890">Call Us</a>
    
    <!-- Anchor link (same page) -->
    <a href="#section2">Go to Section 2</a>
    
    <!-- Download link -->
    <a href="document.pdf" download>Download PDF</a>
    
    <!-- Open in new tab -->
    <a href="https://example.com" target="_blank" rel="noopener noreferrer">
        External Link
    </a>
</body>
```

### Comparison Table:

| Feature | `<link>` | `<a>` |
|---------|----------|-------|
| **Location** | `<head>` | `<body>` |
| **Purpose** | Link resources | Create hyperlinks |
| **Visible** | No | Yes |
| **Clickable** | No | Yes |
| **Closing Tag** | Self-closing | Required |
| **Main Attribute** | `rel` and `href` | `href` |

---

## Q17. What are data attributes in HTML5? How are they used?

**Answer:**

**Data attributes** (custom data attributes) allow you to store extra information on HTML elements without using non-standard attributes or extra DOM properties.

### Syntax:
```html
<element data-*="value">
```

### Examples:
```html
<!-- User information -->
<div 
    data-user-id="12345" 
    data-user-role="admin" 
    data-user-name="John Doe"
>
    User Profile
</div>

<!-- Product information -->
<button 
    data-product-id="ABC123"
    data-product-price="29.99"
    data-product-category="electronics"
>
    Add to Cart
</button>

<!-- Configuration -->
<div 
    data-columns="3"
    data-index="5"
    data-parent="gallery"
>
    Gallery Item
</div>

<!-- Boolean values -->
<div data-active="true" data-visible="false">
    Content
</div>
```

### Accessing with JavaScript:

**Using `dataset` API:**
```javascript
const element = document.querySelector('[data-user-id]');

// Read data attributes
console.log(element.dataset.userId);      // "12345"
console.log(element.dataset.userRole);    // "admin"
console.log(element.dataset.userName);    // "John Doe"

// Set data attributes
element.dataset.userStatus = 'active';

// Remove data attributes
delete element.dataset.userRole;

// Check if exists
if ('userId' in element.dataset) {
    console.log('User ID exists');
}
```

**Using `getAttribute`:**
```javascript
// Read
const userId = element.getAttribute('data-user-id');

// Set
element.setAttribute('data-user-status', 'active');

// Remove
element.removeAttribute('data-user-role');
```

### Accessing with CSS:
```css
/* Select elements with data attribute */
[data-user-role="admin"] {
    background-color: gold;
}

/* Display data attribute value */
.product::after {
    content: attr(data-product-price);
}

/* Multiple selectors */
[data-active="true"] {
    display: block;
}

[data-active="false"] {
    display: none;
}
```

### Use Cases:

**1. Configuration:**
```html
<div id="carousel" data-interval="5000" data-auto-play="true">
    <!-- Carousel items -->
</div>

<script>
const carousel = document.getElementById('carousel');
const interval = carousel.dataset.interval;
const autoPlay = carousel.dataset.autoPlay === 'true';
</script>
```

**2. Event Handling:**
```html
<button data-action="delete" data-id="123">Delete</button>
<button data-action="edit" data-id="123">Edit</button>

<script>
document.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'delete') {
        deleteItem(e.target.dataset.id);
    } else if (e.target.dataset.action === 'edit') {
        editItem(e.target.dataset.id);
    }
});
</script>
```

**3. State Management:**
```html
<div data-state="loading">
    <p data-show-when="loading">Loading...</p>
    <p data-show-when="success">Success!</p>
    <p data-show-when="error">Error occurred</p>
</div>

<style>
[data-state="loading"] [data-show-when="loading"] { display: block; }
[data-state="loading"] [data-show-when="success"],
[data-state="loading"] [data-show-when="error"] { display: none; }
</style>
```

### Best Practices:
- Use lowercase with hyphens: `data-user-name` (not `data-userName`)
- Don't store sensitive information
- Keep values simple (strings, numbers, booleans)
- Use for configuration, not large data storage
- Prefer `dataset` API over `getAttribute` in modern browsers

---

## Q18. What is the difference between `<script>`, `<script async>`, and `<script defer>`?

**Answer:**

These attributes control how JavaScript files are loaded and executed.

### `<script>` (Default - Blocking):
```html
<script src="script.js"></script>
```

**Behavior:**
1. HTML parsing **stops**
2. Script is **downloaded**
3. Script is **executed**
4. HTML parsing **resumes**

**Problems:**
- Blocks page rendering
- Slows down page load
- Bad user experience

---

### `<script async>`:
```html
<script src="script.js" async></script>
```

**Behavior:**
1. HTML parsing **continues**
2. Script downloads **in parallel**
3. When download completes, HTML parsing **pauses**
4. Script **executes immediately**
5. HTML parsing **resumes**

**Characteristics:**
- Non-blocking download
- Executes as soon as downloaded
- **No guaranteed order** of execution
- May execute before DOM is ready

**Use Case:**
- Independent scripts (analytics, ads)
- Scripts that don't depend on DOM or other scripts

```html
<!-- Good for analytics -->
<script src="google-analytics.js" async></script>
<script src="facebook-pixel.js" async></script>
```

---

### `<script defer>`:
```html
<script src="script.js" defer></script>
```

**Behavior:**
1. HTML parsing **continues**
2. Script downloads **in parallel**
3. Script waits until HTML parsing is **complete**
4. Scripts execute in **order** they appear
5. Executes before `DOMContentLoaded` event

**Characteristics:**
- Non-blocking download
- Executes after DOM is ready
- **Maintains order** of execution
- Perfect for DOM manipulation

**Use Case:**
- Scripts that depend on DOM
- Scripts that depend on each other
- Most application scripts

```html
<!-- Executes in order: 1, 2, 3 -->
<script src="library.js" defer></script>
<script src="plugin.js" defer></script>
<script src="app.js" defer></script>
```

---

### Comparison Table:

| Feature | Normal | `async` | `defer` |
|---------|--------|---------|---------|
| **HTML Parsing** | Blocks | Continues | Continues |
| **Download** | Blocks | Parallel | Parallel |
| **Execution** | Immediately | When downloaded | After HTML parsed |
| **Order** | Sequential | Random | Sequential |
| **DOM Ready** | No guarantee | No guarantee | Guaranteed |
| **Use Case** | Critical scripts | Independent scripts | DOM-dependent scripts |

### Visual Timeline:

```
Normal <script>:
HTML Parsing: ████████░░░░░░░░░░████████
Script Download:        ████
Script Execute:             ████

<script async>:
HTML Parsing: ████████████████████████████
Script Download:    ████████
Script Execute:             ░░░░

<script defer>:
HTML Parsing: ████████████████████████████
Script Download:    ████████
Script Execute:                             ████
```

### Best Practices:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Critical CSS -->
    <link rel="stylesheet" href="critical.css">
    
    <!-- Defer application scripts -->
    <script src="app.js" defer></script>
    
    <!-- Async for independent scripts -->
    <script src="analytics.js" async></script>
</head>
<body>
    <!-- Content -->
    
    <!-- Inline scripts (execute immediately) -->
    <script>
        console.log('Inline script');
    </script>
</body>
</html>
```

**Modern Recommendation:**
- Use `defer` for most scripts
- Use `async` only for independent third-party scripts
- Avoid blocking scripts in `<head>`

---

## Q19. What is the difference between `<section>`, `<article>`, and `<div>`?

**Answer:**

### `<div>` (Generic Container):
- **No semantic meaning**
- Generic container for styling/scripting
- Use when no semantic element fits

```html
<div class="wrapper">
    <div class="card">
        <div class="card-header">Header</div>
        <div class="card-body">Content</div>
    </div>
</div>
```

**Use Cases:**
- Styling wrappers
- Layout containers
- When no semantic alternative exists

---

### `<section>` (Thematic Grouping):
- **Semantic meaning**: Thematic grouping of content
- Should have a heading (`<h1>`-`<h6>`)
- Represents a standalone section
- Part of document outline

```html
<article>
    <h1>Complete Guide to HTML</h1>
    
    <section>
        <h2>Introduction</h2>
        <p>HTML is a markup language...</p>
    </section>
    
    <section>
        <h2>Basic Concepts</h2>
        <p>Elements and tags...</p>
    </section>
    
    <section>
        <h2>Advanced Topics</h2>
        <p>Semantic HTML...</p>
    </section>
</article>
```

**Use Cases:**
- Chapters in a document
- Tabbed content sections
- Thematic groups with headings

---

### `<article>` (Independent Content):
- **Semantic meaning**: Self-contained, independent content
- Makes sense on its own
- Can be distributed independently
- Can contain `<section>` elements

```html
<!-- Blog post -->
<article>
    <h1>10 Tips for Better Code</h1>
    <p>Published on <time>2024-01-15</time></p>
    
    <section>
        <h2>Tip 1: Write Clean Code</h2>
        <p>Clean code is...</p>
    </section>
    
    <section>
        <h2>Tip 2: Use Comments</h2>
        <p>Comments help...</p>
    </section>
</article>

<!-- News article -->
<article>
    <h2>Breaking News</h2>
    <p>News content...</p>
</article>

<!-- Forum post -->
<article>
    <h3>Question about HTML</h3>
    <p>Post content...</p>
    
    <section>
        <h4>Comments</h4>
        <article>
            <p>Reply 1...</p>
        </article>
        <article>
            <p>Reply 2...</p>
        </article>
    </section>
</article>
```

**Use Cases:**
- Blog posts
- News articles
- Forum posts
- Product cards
- User comments
- Widgets

---

### Comparison Table:

| Feature | `<div>` | `<section>` | `<article>` |
|---------|---------|-------------|-------------|
| **Semantic** | No | Yes | Yes |
| **Meaning** | None | Thematic group | Independent content |
| **Heading** | Optional | Should have | Should have |
| **Standalone** | No | No | Yes |
| **Reusable** | No | No | Yes (syndication) |
| **Nesting** | Any | Can contain articles | Can contain sections |

### Decision Tree:

```
Is the content self-contained and independently distributable?
├─ YES → Use <article>
└─ NO → Is it a thematic grouping with a heading?
    ├─ YES → Use <section>
    └─ NO → Use <div>
```

### Real-World Example:

```html
<!-- Blog page structure -->
<body>
    <header>
        <h1>My Blog</h1>
        <nav>...</nav>
    </header>
    
    <main>
        <!-- Each blog post is an article -->
        <article>
            <h2>Post Title</h2>
            <p>Post excerpt...</p>
            
            <!-- Sections within article -->
            <section>
                <h3>Introduction</h3>
                <p>Content...</p>
            </section>
            
            <section>
                <h3>Main Content</h3>
                <p>Content...</p>
            </section>
        </article>
        
        <article>
            <h2>Another Post</h2>
            <p>Content...</p>
        </article>
    </main>
    
    <aside>
        <!-- Sidebar sections -->
        <section>
            <h3>Recent Posts</h3>
            <ul>...</ul>
        </section>
        
        <section>
            <h3>Categories</h3>
            <ul>...</ul>
        </section>
    </aside>
    
    <!-- Generic styling wrapper -->
    <div class="modal">
        <div class="modal-content">
            <p>Modal content...</p>
        </div>
    </div>
</body>
```

---

## Q20. What are HTML entities? Why are they used?

**Answer:**

**HTML entities** are special codes used to display reserved characters, symbols, and special characters in HTML.

### Why Use Entities?

1. **Reserved Characters**: Display characters that have special meaning in HTML
2. **Special Symbols**: Display symbols not on keyboard
3. **Character Encoding**: Ensure proper display across different systems

### Syntax:

```html
<!-- Named entity -->
&entityname;

<!-- Numeric entity (decimal) -->
&#number;

<!-- Numeric entity (hexadecimal) -->
&#xhexnumber;
```

### Common Reserved Characters:

| Character | Entity Name | Entity Number | Description |
|-----------|-------------|---------------|-------------|
| `<` | `&lt;` | `&#60;` | Less than |
| `>` | `&gt;` | `&#62;` | Greater than |
| `&` | `&amp;` | `&#38;` | Ampersand |
| `"` | `&quot;` | `&#34;` | Quotation mark |
| `'` | `&apos;` | `&#39;` | Apostrophe |
| ` ` | `&nbsp;` | `&#160;` | Non-breaking space |

**Example:**
```html
<!-- Wrong: Browser interprets as HTML tag -->
<p>Use <div> for containers</p>

<!-- Correct: Displays as text -->
<p>Use &lt;div&gt; for containers</p>
<!-- Output: Use <div> for containers -->
```

### Common Symbols:

| Symbol | Entity Name | Entity Number | Description |
|--------|-------------|---------------|-------------|
| © | `&copy;` | `&#169;` | Copyright |
| ® | `&reg;` | `&#174;` | Registered trademark |
| ™ | `&trade;` | `&#8482;` | Trademark |
| € | `&euro;` | `&#8364;` | Euro |
| £ | `&pound;` | `&#163;` | Pound |
| ¥ | `&yen;` | `&#165;` | Yen |
| ¢ | `&cent;` | `&#162;` | Cent |
| § | `&sect;` | `&#167;` | Section |
| ° | `&deg;` | `&#176;` | Degree |
| ± | `&plusmn;` | `&#177;` | Plus-minus |
| × | `&times;` | `&#215;` | Multiplication |
| ÷ | `&divide;` | `&#247;` | Division |

### Arrows:

| Symbol | Entity Name | Entity Number |
|--------|-------------|---------------|
| ← | `&larr;` | `&#8592;` |
| → | `&rarr;` | `&#8594;` |
| ↑ | `&uarr;` | `&#8593;` |
| ↓ | `&darr;` | `&#8595;` |
| ↔ | `&harr;` | `&#8596;` |

### Math Symbols:

| Symbol | Entity Name | Entity Number |
|--------|-------------|---------------|
| ∀ | `&forall;` | `&#8704;` |
| ∃ | `&exist;` | `&#8707;` |
| ∅ | `&empty;` | `&#8709;` |
| ∞ | `&infin;` | `&#8734;` |
| ≠ | `&ne;` | `&#8800;` |
| ≤ | `&le;` | `&#8804;` |
| ≥ | `&ge;` | `&#8805;` |
| ∑ | `&sum;` | `&#8721;` |
| ∏ | `&prod;` | `&#8719;` |
| √ | `&radic;` | `&#8730;` |

### Greek Letters:

| Symbol | Entity Name | Entity Number |
|--------|-------------|---------------|
| α | `&alpha;` | `&#945;` |
| β | `&beta;` | `&#946;` |
| γ | `&gamma;` | `&#947;` |
| δ | `&delta;` | `&#948;` |
| π | `&pi;` | `&#960;` |
| Σ | `&Sigma;` | `&#931;` |
| Ω | `&Omega;` | `&#937;` |

### Accented Characters:

| Symbol | Entity Name | Entity Number |
|--------|-------------|---------------|
| á | `&aacute;` | `&#225;` |
| é | `&eacute;` | `&#233;` |
| í | `&iacute;` | `&#237;` |
| ó | `&oacute;` | `&#243;` |
| ú | `&uacute;` | `&#250;` |
| ñ | `&ntilde;` | `&#241;` |
| ü | `&uuml;` | `&#252;` |

### Practical Examples:

```html
<!-- Copyright notice -->
<footer>
    &copy; 2024 Company Name. All rights reserved.
</footer>

<!-- Price -->
<p>Price: &euro;29.99</p>

<!-- Math formula -->
<p>Temperature: 25&deg;C &plusmn; 2&deg;</p>

<!-- Code example -->
<p>Use &lt;script&gt; tag for JavaScript</p>

<!-- Quotes -->
<p>&ldquo;Hello World&rdquo; is the first program</p>

<!-- Non-breaking space (prevents line break) -->
<p>Mr.&nbsp;Smith</p>

<!-- Multiple spaces (normally HTML collapses spaces) -->
<p>Space&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;here</p>
```

### When to Use:

✅ **Use entities for:**
- Reserved HTML characters (`<`, `>`, `&`, `"`, `'`)
- Special symbols (©, ®, €, °)
- Non-breaking spaces
- Displaying code examples

❌ **Don't use entities for:**
- Regular text (use UTF-8 encoding instead)
- Modern browsers support Unicode directly

**Modern Approach:**
```html
<meta charset="UTF-8">
<!-- Now you can use symbols directly -->
<p>Price: €29.99</p>
<p>Copyright © 2024</p>
```

---

## Summary

These intermediate HTML questions cover forms, input types, semantic elements, meta tags, and HTML entities - essential knowledge for any frontend developer preparing for interviews.
