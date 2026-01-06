# HTML Accessibility & SEO - Interview Questions & Answers

## Q41. What is ARIA? Why is it important?

**Answer:**

**ARIA** (Accessible Rich Internet Applications) provides additional semantics for assistive technologies.

### ARIA Roles:
```html
<!-- Landmark roles -->
<div role="banner">Header</div>
<div role="navigation">Nav</div>
<div role="main">Main content</div>
<div role="complementary">Sidebar</div>
<div role="contentinfo">Footer</div>

<!-- Widget roles -->
<div role="button">Click me</div>
<div role="tab">Tab 1</div>
<div role="dialog">Modal</div>
<div role="alert">Alert message</div>
<div role="progressbar">Loading...</div>
```

### ARIA Attributes:
```html
<!-- aria-label: Accessible name -->
<button aria-label="Close dialog">×</button>

<!-- aria-labelledby: Reference to label -->
<h2 id="dialog-title">Confirm Action</h2>
<div role="dialog" aria-labelledby="dialog-title">...</div>

<!-- aria-describedby: Additional description -->
<input type="password" aria-describedby="password-hint">
<span id="password-hint">Must be 8+ characters</span>

<!-- aria-hidden: Hide from screen readers -->
<span aria-hidden="true">★</span>

<!-- aria-live: Announce dynamic changes -->
<div aria-live="polite">Status updated</div>
<div aria-live="assertive">Error occurred!</div>

<!-- aria-expanded: Expandable state -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<div id="menu" hidden>...</div>

<!-- aria-selected: Selection state -->
<div role="tab" aria-selected="true">Tab 1</div>

<!-- aria-disabled: Disabled state -->
<button aria-disabled="true">Submit</button>

<!-- aria-required: Required field -->
<input type="text" aria-required="true">

<!-- aria-invalid: Validation state -->
<input type="email" aria-invalid="true" aria-describedby="email-error">
<span id="email-error">Invalid email format</span>
```

**When to Use ARIA:**
- Use semantic HTML first
- ARIA when HTML semantics insufficient
- Custom widgets (tabs, accordions, modals)
- Dynamic content updates
- Complex interactions

---

## Q42. What are accessibility best practices for forms?

**Answer:**

```html
<form>
    <!-- Always use labels -->
    <label for="username">Username:</label>
    <input type="text" id="username" name="username" required>
    
    <!-- Group related fields -->
    <fieldset>
        <legend>Personal Information</legend>
        
        <label for="firstName">First Name:</label>
        <input type="text" id="firstName" required>
        
        <label for="lastName">Last Name:</label>
        <input type="text" id="lastName" required>
    </fieldset>
    
    <!-- Radio buttons -->
    <fieldset>
        <legend>Gender:</legend>
        <input type="radio" id="male" name="gender" value="male">
        <label for="male">Male</label>
        
        <input type="radio" id="female" name="gender" value="female">
        <label for="female">Female</label>
    </fieldset>
    
    <!-- Error messages -->
    <label for="email">Email:</label>
    <input 
        type="email" 
        id="email" 
        aria-invalid="true" 
        aria-describedby="email-error"
    >
    <span id="email-error" role="alert">Please enter a valid email</span>
    
    <!-- Help text -->
    <label for="password">Password:</label>
    <input 
        type="password" 
        id="password" 
        aria-describedby="password-hint"
    >
    <span id="password-hint">Must be at least 8 characters</span>
    
    <!-- Clear button labels -->
    <button type="submit">Submit Form</button>
    <button type="reset">Clear Form</button>
</form>
```

---

## Q43. What is semantic HTML for SEO?

**Answer:**

Semantic HTML improves SEO by helping search engines understand content structure.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Page Title - Brand Name</title>
    <meta name="description" content="Concise page description (150-160 chars)">
    <meta name="keywords" content="keyword1, keyword2, keyword3">
    <link rel="canonical" href="https://example.com/page">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Page Title">
    <meta property="og:description" content="Page description">
    <meta property="og:image" content="https://example.com/image.jpg">
    <meta property="og:url" content="https://example.com/page">
</head>
<body>
    <header>
        <h1>Main Site Title</h1>
        <nav>
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <article>
            <header>
                <h1>Article Title (H1 - only one per page)</h1>
                <time datetime="2024-01-15">January 15, 2024</time>
            </header>
            
            <section>
                <h2>Section Heading (H2)</h2>
                <p>Content with <strong>important keywords</strong>.</p>
                
                <h3>Subsection (H3)</h3>
                <p>More content...</p>
            </section>
            
            <figure>
                <img src="image.jpg" alt="Descriptive alt text with keywords">
                <figcaption>Image caption</figcaption>
            </figure>
        </article>
    </main>
    
    <aside>
        <section>
            <h2>Related Articles</h2>
            <ul>
                <li><a href="/article1">Article 1</a></li>
            </ul>
        </section>
    </aside>
    
    <footer>
        <p>&copy; 2024 Company Name</p>
    </footer>
</body>
</html>
```

**SEO Best Practices:**
- One `<h1>` per page
- Proper heading hierarchy (H1 → H2 → H3)
- Descriptive alt text for images
- Semantic elements (`<article>`, `<section>`, etc.)
- Clean URL structure
- Mobile-responsive
- Fast loading
- Valid HTML

---

## Q44. What are heading levels and why are they important?

**Answer:**

Headings create document outline for accessibility and SEO.

```html
<!-- Correct hierarchy -->
<h1>Main Page Title</h1>
    <h2>Section 1</h2>
        <h3>Subsection 1.1</h3>
        <h3>Subsection 1.2</h3>
    <h2>Section 2</h2>
        <h3>Subsection 2.1</h3>

<!-- Wrong: Skipping levels -->
<h1>Title</h1>
<h3>Subsection</h3>  <!-- Bad: skipped H2 -->

<!-- Wrong: Multiple H1s -->
<h1>Title 1</h1>
<h1>Title 2</h1>  <!-- Bad: only one H1 per page -->
```

**Importance:**
- Screen readers use headings for navigation
- SEO: Search engines understand content structure
- Accessibility: Users can jump between sections
- Outline: Creates logical document structure

---

## Q45. What is the `alt` attribute? Best practices?

**Answer:**

The `alt` attribute provides alternative text for images.

```html
<!-- Good: Descriptive -->
<img src="golden-retriever.jpg" alt="Golden retriever playing fetch in park">

<!-- Good: Functional -->
<a href="/home">
    <img src="logo.png" alt="Company Name Home">
</a>

<!-- Good: Empty for decorative images -->
<img src="decorative-border.png" alt="">

<!-- Bad: Redundant -->
<img src="photo.jpg" alt="Photo">  <!-- Too generic -->

<!-- Bad: Filename -->
<img src="IMG_1234.jpg" alt="IMG_1234">  <!-- Not descriptive -->

<!-- Complex images -->
<figure>
    <img src="sales-chart.jpg" alt="Bar chart showing 25% sales increase in Q4 2024">
    <figcaption>Q4 2024 Sales Performance</figcaption>
</figure>

<!-- Long descriptions -->
<img src="complex-diagram.jpg" alt="System architecture diagram" aria-describedby="diagram-desc">
<div id="diagram-desc">
    Detailed description of the diagram...
</div>
```

**Best Practices:**
- Be descriptive and concise
- Include context and function
- Empty alt for decorative images
- Don't use "image of" or "picture of"
- Include text in images
- Consider context

---

## Q46. What is keyboard accessibility?

**Answer:**

Ensuring all functionality is accessible via keyboard.

```html
<!-- Focusable elements -->
<a href="/page">Link</a>
<button>Button</button>
<input type="text">
<select>...</select>
<textarea></textarea>

<!-- Custom focusable element -->
<div tabindex="0" role="button">Custom Button</div>

<!-- Skip navigation link -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<nav>...</nav>

<main id="main-content">
    Content
</main>

<style>
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
}

.skip-link:focus {
    top: 0;
}
</style>

<!-- Keyboard trap prevention -->
<div role="dialog" aria-modal="true">
    <button>First focusable</button>
    <input type="text">
    <button>Last focusable</button>
</div>

<script>
// Trap focus within modal
const modal = document.querySelector('[role="dialog"]');
const focusable = modal.querySelectorAll('button, input, select, textarea, a[href]');
const firstFocusable = focusable[0];
const lastFocusable = focusable[focusable.length - 1];

lastFocusable.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        firstFocusable.focus();
    }
});

firstFocusable.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        lastFocusable.focus();
    }
});
</script>
```

**tabindex values:**
- `tabindex="0"` - Natural tab order
- `tabindex="-1"` - Programmatically focusable only
- `tabindex="1+"` - Custom tab order (avoid!)

---

## Q47. What is the `lang` attribute?

**Answer:**

Specifies the language of content for screen readers and search engines.

```html
<!-- Page language -->
<html lang="en">

<!-- Different language section -->
<p>The French word for hello is <span lang="fr">bonjour</span>.</p>

<!-- Multiple languages -->
<html lang="en">
<body>
    <p>English content</p>
    <p lang="es">Contenido en español</p>
    <p lang="fr">Contenu en français</p>
</body>
</html>

<!-- Language variants -->
<html lang="en-US">  <!-- US English -->
<html lang="en-GB">  <!-- British English -->
<html lang="zh-CN">  <!-- Simplified Chinese -->
<html lang="zh-TW">  <!-- Traditional Chinese -->
```

**Benefits:**
- Screen readers use correct pronunciation
- Search engines show in correct language results
- Browsers can offer translation
- Spell checkers use correct dictionary

---

## Q48. What are structured data and Schema.org markup?

**Answer:**

Structured data helps search engines understand content.

```html
<!-- Article schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  },
  "datePublished": "2024-01-15",
  "image": "https://example.com/image.jpg",
  "publisher": {
    "@type": "Organization",
    "name": "Publisher Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.jpg"
    }
  }
}
</script>

<!-- Product schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": "https://example.com/product.jpg",
  "description": "Product description",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "100"
  }
}
</script>

<!-- Breadcrumb schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": "https://example.com"
  },{
    "@type": "ListItem",
    "position": 2,
    "name": "Category",
    "item": "https://example.com/category"
  },{
    "@type": "ListItem",
    "position": 3,
    "name": "Product",
    "item": "https://example.com/category/product"
  }]
}
</script>
```

**Benefits:**
- Rich snippets in search results
- Better SEO
- Enhanced search appearance
- Voice search optimization

---

## Q49. What are best practices for links?

**Answer:**

```html
<!-- Descriptive link text -->
<a href="/article">Read the full article about HTML accessibility</a>

<!-- Bad: Generic text -->
<a href="/article">Click here</a>  <!-- Not descriptive -->

<!-- External links -->
<a href="https://external.com" target="_blank" rel="noopener noreferrer">
    External Link
</a>

<!-- Download links -->
<a href="document.pdf" download>
    Download PDF (2.5 MB)
</a>

<!-- Email links -->
<a href="mailto:email@example.com">email@example.com</a>

<!-- Phone links -->
<a href="tel:+1234567890">Call us: (123) 456-7890</a>

<!-- Skip links -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Breadcrumbs -->
<nav aria-label="Breadcrumb">
    <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/category">Category</a></li>
        <li aria-current="page">Current Page</li>
    </ol>
</nav>
```

**Best Practices:**
- Use descriptive link text
- Indicate external links
- Show file type and size for downloads
- Use `rel="noopener noreferrer"` for `target="_blank"`
  - **`noopener`**: Prevents new page from accessing `window.opener` (security - prevents tabnabbing attacks)
  - **`noreferrer`**: Doesn't send referrer info to new page (privacy - hides where user came from)
  - **Why needed**: Without these, opened page can redirect your original page using `window.opener.location`
- Ensure sufficient color contrast
- Make links keyboard accessible

---

## Q50. What is the difference between `<b>`, `<strong>`, `<i>`, `<em>`, `<mark>`, and `<u>`?

**Answer:**

| Element | Meaning | Visual | Use Case |
|---------|---------|--------|----------|
| `<strong>` | Strong importance | Bold | Important text, warnings |
| `<b>` | Stylistic bold | Bold | Keywords, product names |
| `<em>` | Emphasis | Italic | Stressed words |
| `<i>` | Alternate voice | Italic | Technical terms, foreign words |
| `<mark>` | Highlighted | Yellow bg | Search results, highlights |
| `<u>` | Unarticulated annotation | Underline | Spelling errors, proper names (Chinese) |

```html
<!-- Strong importance -->
<p><strong>Warning:</strong> This action cannot be undone.</p>

<!-- Stylistic bold -->
<p><b>Product Name:</b> XYZ Widget</p>

<!-- Emphasis -->
<p>I <em>really</em> love this!</p>

<!-- Alternate voice -->
<p>The term <i>et cetera</i> means "and so forth".</p>

<!-- Highlighted -->
<p>Search results for <mark>HTML</mark></p>

<!-- Annotation -->
<p>This is <u class="spelling-error">speling</u> mistake.</p>
```

**Semantic vs Presentational:**
- Use `<strong>` and `<em>` for semantic meaning
- Use `<b>` and `<i>` for presentation only
- Use CSS for pure styling

---

## Summary

Accessibility and SEO are crucial for modern web development. Use semantic HTML, ARIA when needed, proper heading structure, descriptive alt text, keyboard accessibility, and structured data to create inclusive and search-engine-friendly websites.
