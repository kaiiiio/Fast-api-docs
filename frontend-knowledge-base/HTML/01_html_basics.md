# HTML Basics - Interview Questions & Answers

## Q1. What is HTML and what does it stand for?

**Answer:**
HTML stands for **HyperText Markup Language**. It is the standard markup language used to create and structure content on the web. HTML uses a system of tags and elements to define different parts of a webpage, such as headings, paragraphs, links, images, and more.

**Key Points:**
- **HyperText**: Refers to links that connect web pages to one another
- **Markup**: Uses tags to annotate text and define structure
- **Language**: A standardized system with syntax and rules
- HTML is not a programming language; it's a markup language
- Current version: HTML5 (released in 2014)

---

## Q2. What is the basic structure of an HTML document?

**Answer:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Title</title>
</head>
<body>
    <!-- Content goes here -->
</body>
</html>
```

**Explanation:**
- `<!DOCTYPE html>`: Declares HTML5 document type
- `<html>`: Root element containing all HTML content
- `<head>`: Contains metadata, title, links to CSS/JS
- `<meta charset="UTF-8">`: Specifies character encoding
- `<meta name="viewport">`: Ensures responsive design on mobile
- `<title>`: Sets the page title (shown in browser tab)
- `<body>`: Contains all visible content

---

## Q3. What is the difference between HTML elements and HTML tags?

**Answer:**

**HTML Tag:**
- The syntax used to mark up content
- Consists of opening tag `<tagname>` and closing tag `</tagname>`
- Example: `<p>` and `</p>`

**HTML Element:**
- The complete structure including opening tag, content, and closing tag
- Example: `<p>This is a paragraph</p>` (entire thing is an element)

```html
<!-- Tag -->
<h1>  <!-- Opening tag -->
</h1> <!-- Closing tag -->

<!-- Element -->
<h1>Hello World</h1>  <!-- Complete element -->

<!-- Self-closing element -->
<img src="image.jpg" alt="description" />
```

---

## Q4. What are semantic HTML elements? Why are they important?

**Answer:**

**Semantic HTML** elements clearly describe their meaning to both the browser and the developer.

**Common Semantic Elements:**
```html
<header>    <!-- Page or section header -->
<nav>       <!-- Navigation links -->
<main>      <!-- Main content -->
<article>   <!-- Independent, self-contained content -->
<section>   <!-- Thematic grouping of content -->
<aside>     <!-- Sidebar or related content -->
<footer>    <!-- Page or section footer -->
<figure>    <!-- Self-contained content like images -->
<figcaption><!-- Caption for figure -->
<time>      <!-- Date/time -->
<mark>      <!-- Highlighted text -->
```

**Benefits:**
1. **Accessibility**: Screen readers can navigate better
2. **SEO**: Search engines understand content structure
3. **Maintainability**: Code is more readable and easier to maintain
4. **Consistency**: Standardized meaning across developers

**Non-Semantic vs Semantic:**
```html
<!-- Non-semantic (bad) -->
<div id="header">
    <div id="nav">...</div>
</div>

<!-- Semantic (good) -->
<header>
    <nav>...</nav>
</header>
```

---

## Q5. What is the difference between `<div>` and `<span>`?

**Answer:**

| Feature | `<div>` | `<span>` |
|---------|---------|----------|
| **Display** | Block-level | Inline |
| **Width** | Takes full width available | Takes only necessary width |
| **Line Break** | Starts on new line | Stays on same line |
| **Use Case** | Container for larger sections | Container for small text portions |
| **Semantic Meaning** | None (generic container) | None (generic container) |

**Example:**
```html
<!-- div: Block-level -->
<div style="background: lightblue;">
    This is a div element
</div>
<div style="background: lightgreen;">
    This is another div
</div>

<!-- span: Inline -->
<p>
    This is <span style="color: red;">red text</span> in a paragraph.
</p>
```

**Output:**
- Divs appear on separate lines
- Span appears inline with surrounding text

---

## Q6. What are HTML attributes? Give examples.

**Answer:**

**HTML Attributes** provide additional information about HTML elements. They are always specified in the opening tag and usually come in name/value pairs.

**Syntax:**
```html
<tagname attribute="value">Content</tagname>
```

**Common Attributes:**

```html
<!-- id: Unique identifier -->
<div id="header">...</div>

<!-- class: CSS class for styling -->
<p class="highlight important">...</p>

<!-- src: Source file path -->
<img src="image.jpg" alt="description">

<!-- href: Hyperlink reference -->
<a href="https://example.com">Link</a>

<!-- style: Inline CSS -->
<p style="color: red; font-size: 16px;">Text</p>

<!-- title: Tooltip text -->
<abbr title="HyperText Markup Language">HTML</abbr>

<!-- data-*: Custom data attributes -->
<div data-user-id="123" data-role="admin">...</div>

<!-- disabled: Disables input -->
<button disabled>Click Me</button>

<!-- required: Makes input mandatory -->
<input type="text" required>
```

**Global Attributes** (work on any element):
- `id`, `class`, `style`, `title`, `lang`, `dir`, `tabindex`, `hidden`, `data-*`

---

## Q7. What is the difference between `id` and `class` attributes?

**Answer:**

| Feature | `id` | `class` |
|---------|------|---------|
| **Uniqueness** | Must be unique on page | Can be reused multiple times |
| **Elements** | One element per id | Multiple elements can share |
| **CSS Selector** | `#idname` | `.classname` |
| **JavaScript** | `getElementById()` | `getElementsByClassName()` |
| **Specificity** | Higher (100) | Lower (10) |
| **Use Case** | Unique elements, anchors | Styling groups of elements |

**Example:**
```html
<!-- id: Unique -->
<div id="header">Header</div>
<div id="footer">Footer</div>

<!-- class: Reusable -->
<p class="highlight">Paragraph 1</p>
<p class="highlight">Paragraph 2</p>
<div class="highlight">Div</div>

<!-- Multiple classes -->
<p class="highlight bold large">Text</p>
```

**CSS:**
```css
/* Target by id */
#header { background: blue; }

/* Target by class */
.highlight { color: yellow; }
```

**Best Practice:**
- Use `id` for unique elements and JavaScript targeting
- Use `class` for styling and reusable components

---

## Q8. What are self-closing tags in HTML? Give examples.

**Answer:**

**Self-closing tags** (also called **void elements** or **empty elements**) are HTML tags that don't need separate closing tags because they cannot contain any content. They represent standalone elements.

**Key Point:** In HTML5, you can write them with or without the trailing slash (`/>`), but in XHTML, the slash is required.

**Common Self-Closing Tags:**

```html
<!-- Images -->
<img src="photo.jpg" alt="Photo">
<!-- HTML5 (both valid) -->
<img src="photo.jpg" alt="Photo">
<img src="photo.jpg" alt="Photo" />

<!-- But you NEVER write -->
<img src="photo.jpg" alt="Photo"></img>  ❌ Wrong!

<!-- Line break -->
<br>

<!-- Horizontal rule -->
<hr>

<!-- Input fields -->
<input type="text" name="username">

<!-- Meta information -->
<meta charset="UTF-8">

<!-- Link to external resources -->
<link rel="stylesheet" href="style.css">

<!-- Embed external content -->
<embed src="video.mp4">

<!-- Area in image map -->
<area shape="rect" coords="0,0,100,100" href="link.html">

<!-- Base URL -->
<base href="https://example.com/">

<!-- Column properties -->
<col span="2">

<!-- Parameter for object -->
<param name="autoplay" value="true">

<!-- Source for media -->
<source src="audio.mp3" type="audio/mpeg">

<!-- Track for video/audio -->
<track src="subtitles.vtt" kind="subtitles">

<!-- Word break opportunity -->
<wbr>
```

**HTML5 Syntax:**
```html
<!-- Both are valid in HTML5 -->
<img src="photo.jpg" alt="Photo">
<img src="photo.jpg" alt="Photo" />

<!-- XHTML requires closing slash -->
<img src="photo.jpg" alt="Photo" />
```

---

## Q9. What is the purpose of the DOCTYPE declaration?

**Answer:**

The `<!DOCTYPE>` declaration tells the browser which version of HTML the page is written in, ensuring the page is parsed correctly.

**HTML5 DOCTYPE:**
```html
<!DOCTYPE html>
```

**Why It's Important:**

1. **Standards Mode**: Ensures browser renders in standards-compliant mode
2. **Quirks Mode Prevention**: Without DOCTYPE, browsers may use quirks mode (legacy behavior)
3. **Validation**: Helps validators check HTML correctness
4. **Consistency**: Ensures consistent rendering across browsers

**Older DOCTYPEs (HTML4/XHTML):**
```html
<!-- HTML 4.01 Strict -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" 
"http://www.w3.org/TR/html4/strict.dtd">

<!-- XHTML 1.0 Strict -->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
```

**HTML5 Advantages:**
- Much simpler syntax
- Case-insensitive
- No version number needed
- Always use `<!DOCTYPE html>` as the first line

---

## Q10. What is the difference between block-level and inline elements?

**Answer:**

**Block-Level Elements:**
- Start on a new line
- Take up full width available (100% of parent)
- Can contain other block and inline elements
- Height and width can be controlled with CSS

**Common Block Elements:**
```html
<div>, <p>, <h1>-<h6>, <ul>, <ol>, <li>, <section>, 
<article>, <header>, <footer>, <nav>, <main>, <form>, 
<table>, <blockquote>, <pre>, <hr>
```

**Inline Elements:**
- Stay on the same line
- Take only necessary width (content width)
- Cannot contain block-level elements (usually)
- Height and width cannot be set (by default)

**Common Inline Elements:**
```html
<span>, <a>, <img>, <strong>, <em>, <b>, <i>, <u>, 
<small>, <mark>, <abbr>, <code>, <label>, <input>, 
<button>, <select>, <textarea>
```

**Example:**
```html
<!-- Block elements -->
<div style="background: lightblue;">Block 1</div>
<div style="background: lightgreen;">Block 2</div>

<!-- Inline elements -->
<span style="background: yellow;">Inline 1</span>
<span style="background: pink;">Inline 2</span>
```

**Visual Output:**
```
[Block 1                    ]
[Block 2                    ]
[Inline 1][Inline 2]
```

**CSS Display Property:**
```css
/* Change display behavior */
div { display: inline; }    /* Block to inline */
span { display: block; }    /* Inline to block */
div { display: inline-block; } /* Hybrid behavior */
```

**Inline-Block:**
- Stays on same line (like inline)
- Can set width/height (like block)
- Best of both worlds

---

## Summary

These 10 questions cover the fundamental concepts of HTML that every frontend developer should know. Understanding these basics is crucial for building upon more advanced HTML topics.

**Key Takeaways:**
- HTML is a markup language for structuring web content
- Semantic elements improve accessibility and SEO
- Attributes provide additional information about elements
- Block and inline elements behave differently in layout
- DOCTYPE ensures proper browser rendering
