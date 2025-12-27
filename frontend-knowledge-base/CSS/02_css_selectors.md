# CSS Selectors & Specificity - Interview Questions & Answers

## Q11. What are Pseudo-classes? Give examples.

**Answer:**

Pseudo-classes select elements based on their state or position.

### Link/User Action Pseudo-classes:
```css
a:link { color: blue; }          /* Unvisited link */
a:visited { color: purple; }     /* Visited link */
a:hover { color: red; }          /* Mouse over */
a:active { color: orange; }      /* Being clicked */
a:focus { outline: 2px solid blue; }  /* Keyboard focus */
```

### Form Pseudo-classes:
```css
input:focus { border-color: blue; }
input:disabled { opacity: 0.5; }
input:enabled { background: white; }
input:checked { background: green; }
input:required { border-color: red; }
input:optional { border-color: gray; }
input:valid { border-color: green; }
input:invalid { border-color: red; }
input:in-range { border-color: green; }
input:out-of-range { border-color: red; }
input:read-only { background: #f0f0f0; }
input:read-write { background: white; }
input:placeholder-shown { font-style: italic; }
```

### Structural Pseudo-classes:
```css
li:first-child { font-weight: bold; }
li:last-child { margin-bottom: 0; }
li:only-child { list-style: none; }

li:nth-child(2) { color: red; }      /* 2nd child */
li:nth-child(2n) { background: #f0f0f0; }  /* Even (2, 4, 6...) */
li:nth-child(odd) { background: white; }   /* Odd (1, 3, 5...) */
li:nth-child(3n+1) { color: blue; }  /* 1, 4, 7, 10... */

li:nth-last-child(2) { color: green; }  /* 2nd from end */

p:first-of-type { margin-top: 0; }
p:last-of-type { margin-bottom: 0; }
p:nth-of-type(2) { color: red; }
p:only-of-type { font-weight: bold; }

div:empty { display: none; }  /* No children */
```

### Negation:
```css
p:not(.special) { color: gray; }
li:not(:last-child) { margin-bottom: 10px; }
input:not([type="submit"]) { width: 100%; }
```

### Other Useful Pseudo-classes:
```css
:root { --main-color: blue; }  /* Root element */
:target { background: yellow; }  /* URL fragment target */
:lang(en) { quotes: """ """; }  /* Language */
:is(h1, h2, h3) { color: blue; }  /* Matches any */
:where(h1, h2, h3) { margin: 0; }  /* Zero specificity */
:has(> img) { padding: 20px; }  /* Parent selector */
```

---

## Q12. What are Pseudo-elements? How do they differ from Pseudo-classes?

**Answer:**

Pseudo-elements style specific parts of an element.

### Syntax:
```css
/* Single colon (old) */
p:before { content: "→ "; }

/* Double colon (modern, preferred) */
p::before { content: "→ "; }
```

### Common Pseudo-elements:
```css
/* First letter */
p::first-letter {
    font-size: 2em;
    font-weight: bold;
    float: left;
}

/* First line */
p::first-line {
    font-weight: bold;
    color: blue;
}

/* Before content */
.icon::before {
    content: "★ ";
    color: gold;
}

/* After content */
.link::after {
    content: " →";
}

/* Selection */
::selection {
    background: yellow;
    color: black;
}

/* Placeholder */
input::placeholder {
    color: #999;
    font-style: italic;
}

/* Marker (list bullets) */
li::marker {
    color: red;
    font-size: 1.5em;
}
```

### Practical Examples:
```css
/* Clearfix */
.clearfix::after {
    content: "";
    display: table;
    clear: both;
}

/* Quotation marks */
blockquote::before {
    content: open-quote;
}
blockquote::after {
    content: close-quote;
}

/* Icon fonts */
.icon-home::before {
    content: "\f015";
    font-family: "Font Awesome";
}

/* Tooltips */
[data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    background: black;
    color: white;
    padding: 5px;
}
```

### Pseudo-class vs Pseudo-element:

| Feature | Pseudo-class | Pseudo-element |
|---------|--------------|----------------|
| **Syntax** | Single `:` | Double `::` |
| **Targets** | Element state | Part of element |
| **Examples** | `:hover`, `:focus` | `::before`, `::after` |
| **Creates** | Nothing new | Virtual element |

---

## Q13. What is the difference between `:nth-child()` and `:nth-of-type()`?

**Answer:**

```html
<div>
    <p>Paragraph 1</p>
    <span>Span</span>
    <p>Paragraph 2</p>
    <p>Paragraph 3</p>
</div>
```

```css
/* :nth-child() - counts ALL children */
p:nth-child(2) {
    color: red;  /* Selects NOTHING (2nd child is span) */
}

p:nth-child(3) {
    color: blue;  /* Selects "Paragraph 2" (3rd child) */
}

/* :nth-of-type() - counts only same type */
p:nth-of-type(2) {
    color: green;  /* Selects "Paragraph 2" (2nd p element) */
}

p:nth-of-type(1) {
    color: purple;  /* Selects "Paragraph 1" (1st p element) */
}
```

**Use Cases:**
```css
/* Zebra striping for table rows */
tr:nth-child(even) { background: #f0f0f0; }

/* Style every 3rd paragraph */
p:nth-of-type(3n) { font-weight: bold; }

/* First and last of type */
article:first-of-type { margin-top: 0; }
article:last-of-type { margin-bottom: 0; }
```

---

## Q14. What is CSS Inheritance? Which properties inherit?

**Answer:**

**Inheritance** means child elements inherit certain CSS properties from parents.

### Inherited Properties:
```css
/* Text properties (inherit) */
body {
    color: #333;           /* ✓ Inherited */
    font-family: Arial;    /* ✓ Inherited */
    font-size: 16px;       /* ✓ Inherited */
    font-weight: normal;   /* ✓ Inherited */
    line-height: 1.5;      /* ✓ Inherited */
    text-align: left;      /* ✓ Inherited */
    letter-spacing: 1px;   /* ✓ Inherited */
    word-spacing: 2px;     /* ✓ Inherited */
    text-transform: none;  /* ✓ Inherited */
    visibility: visible;   /* ✓ Inherited */
    cursor: pointer;       /* ✓ Inherited */
}

/* Box properties (NOT inherited) */
div {
    margin: 10px;          /* ✗ Not inherited */
    padding: 10px;         /* ✗ Not inherited */
    border: 1px solid;     /* ✗ Not inherited */
    width: 100px;          /* ✗ Not inherited */
    height: 100px;         /* ✗ Not inherited */
    background: white;     /* ✗ Not inherited */
    display: block;        /* ✗ Not inherited */
    position: relative;    /* ✗ Not inherited */
}
```

### Controlling Inheritance:
```css
.element {
    color: inherit;   /* Force inheritance */
    margin: initial;  /* Reset to default value */
    padding: unset;   /* Inherit if inheritable, else initial */
    all: revert;      /* Revert to browser default */
}
```

**Example:**
```html
<div style="color: blue; margin: 20px;">
    <p>This text is blue (inherited)</p>
    <p>This paragraph has NO margin (not inherited)</p>
</div>
```

---

## Q15. What is the `!important` rule? When should it be used?

**Answer:**

`!important` overrides all other declarations, regardless of specificity.

```css
.text {
    color: red !important;  /* Highest priority */
}

#header .text {
    color: blue;  /* Ignored, even though more specific */
}
```

### Specificity with !important:
```css
/* Normal specificity order */
p { color: red; }           /* (0,0,0,1) */
.text { color: blue; }      /* (0,0,1,0) - Wins */
#main { color: green; }     /* (0,1,0,0) - Wins */

/* With !important */
p { color: red !important; }     /* Wins over everything */
.text { color: blue; }
#main { color: green; }

/* Multiple !important: specificity matters again */
p { color: red !important; }
.text { color: blue !important; }  /* Wins (higher specificity) */
```

### When to Use:
```css
/* ✓ Utility classes */
.hidden { display: none !important; }
.text-center { text-align: center !important; }

/* ✓ Override third-party CSS */
.bootstrap-button { background: red !important; }

/* ✓ Debugging (temporary) */
.debug { border: 2px solid red !important; }
```

### When NOT to Use:
```css
/* ✗ Regular styling */
.button { color: blue !important; }  /* Bad */

/* ✗ Lazy specificity fix */
div div div p { color: red !important; }  /* Very bad */
```

**Better Alternatives:**
```css
/* Instead of !important, increase specificity properly */
.container .button { color: blue; }

/* Or use more specific selector */
button.primary { color: blue; }

/* Or restructure CSS */
```

---

## Q16. What is the difference between `class` and `id` selectors in CSS?

**Answer:**

| Feature | Class (`.class`) | ID (`#id`) |
|---------|------------------|------------|
| **Uniqueness** | Reusable | Unique per page |
| **Specificity** | Low (0,0,1,0) | High (0,1,0,0) |
| **Multiple** | Can have multiple classes | One ID per element |
| **JavaScript** | `getElementsByClassName()` | `getElementById()` |
| **Use Case** | Styling groups | Unique elements, anchors |

```html
<!-- Class: Reusable -->
<div class="card highlight">Card 1</div>
<div class="card">Card 2</div>
<div class="card highlight">Card 3</div>

<!-- ID: Unique -->
<div id="header">Header</div>
<div id="footer">Footer</div>
```

```css
/* Class selector */
.card {
    padding: 20px;
    border: 1px solid #ccc;
}

.highlight {
    background: yellow;
}

/* ID selector */
#header {
    position: fixed;
    top: 0;
}

#footer {
    margin-top: 50px;
}
```

**Best Practices:**
- Use classes for styling
- Use IDs for JavaScript targeting and anchors
- Avoid IDs in CSS (high specificity causes problems)

---

## Q17. What are Attribute Selectors? Give examples.

**Answer:**

Attribute selectors target elements based on attributes.

```css
/* Has attribute */
[disabled] { opacity: 0.5; }
[href] { color: blue; }

/* Exact match */
[type="text"] { border: 1px solid gray; }
[class="button"] { padding: 10px; }

/* Contains word (space-separated) */
[class~="active"] { font-weight: bold; }
/* Matches: class="button active" */

/* Starts with */
[href^="https"] { color: green; }
[class^="icon-"] { font-family: "Icons"; }

/* Ends with */
[href$=".pdf"] { background: url(pdf-icon.png); }
[src$=".jpg"] { border: 2px solid gray; }

/* Contains substring */
[href*="example"] { text-decoration: underline; }
[class*="button"] { cursor: pointer; }

/* Starts with (language code) */
[lang|="en"] { quotes: """ """; }
/* Matches: lang="en" or lang="en-US" */

/* Case-insensitive */
[href$=".PDF" i] { background: url(pdf-icon.png); }
```

**Practical Examples:**
```css
/* External links */
a[href^="http"]::after {
    content: " ↗";
}

/* Email links */
a[href^="mailto"]::before {
    content: "✉ ";
}

/* Download links */
a[download] {
    font-weight: bold;
}

/* Required fields */
input[required] {
    border-left: 3px solid red;
}

/* File type icons */
a[href$=".pdf"]::before { content: "📄 "; }
a[href$=".zip"]::before { content: "📦 "; }
a[href$=".doc"]::before { content: "📝 "; }
```

---

## Q18. What is the Universal Selector? When to use it?

**Answer:**

The universal selector (`*`) matches all elements.

```css
/* Select all elements */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Within a container */
.container * {
    color: inherit;
}

/* Except certain elements */
*:not(p) {
    margin: 0;
}
```

### Common Use Cases:
```css
/* CSS Reset */
* {
    margin: 0;
    padding: 0;
}

/* Box-sizing reset */
*, *::before, *::after {
    box-sizing: border-box;
}

/* Debug borders */
* {
    outline: 1px solid red;
}
```

### Performance Consideration:
```css
/* ✗ Slow: applies to ALL elements */
* {
    font-family: Arial;
}

/* ✓ Better: use inheritance */
body {
    font-family: Arial;  /* Children inherit */
}
```

---

## Q19. What are Combinator Selectors?

**Answer:**

Combinators define relationships between selectors.

### Descendant (space):
```css
/* All p inside div (any level) */
div p {
    color: red;
}
```
```html
<div>
    <p>Red</p>
    <section>
        <p>Also red</p>
    </section>
</div>
```

### Child (>):
```css
/* Direct children only */
div > p {
    color: blue;
}
```
```html
<div>
    <p>Blue</p>
    <section>
        <p>Not blue</p>
    </section>
</div>
```

### Adjacent Sibling (+):
```css
/* p immediately after h1 */
h1 + p {
    font-weight: bold;
}
```
```html
<h1>Title</h1>
<p>Bold (immediately after h1)</p>
<p>Not bold</p>
```

### General Sibling (~):
```css
/* All p siblings after h1 */
h1 ~ p {
    color: gray;
}
```
```html
<h1>Title</h1>
<p>Gray</p>
<div>...</div>
<p>Also gray</p>
```

**Practical Examples:**
```css
/* First paragraph after heading */
h2 + p {
    margin-top: 0;
}

/* List items in navigation */
nav > ul > li {
    display: inline-block;
}

/* Form label + input */
label + input {
    margin-left: 10px;
}

/* All siblings after active tab */
.tab.active ~ .tab {
    opacity: 0.5;
}
```

---

## Q20. How do you calculate CSS Specificity? Give examples.

**Answer:**

Specificity is calculated as: `(inline, IDs, classes, elements)`

### Calculation Examples:
```css
/* (0, 0, 0, 1) = 1 */
p { }

/* (0, 0, 0, 2) = 2 */
div p { }

/* (0, 0, 1, 0) = 10 */
.text { }

/* (0, 0, 1, 1) = 11 */
p.text { }

/* (0, 0, 2, 0) = 20 */
.container .text { }

/* (0, 1, 0, 0) = 100 */
#header { }

/* (0, 1, 1, 1) = 111 */
#header .nav a { }

/* (0, 1, 2, 2) = 122 */
#header .nav ul li { }

/* (1, 0, 0, 0) = 1000 */
style="color: red;"

/* (0, 0, 1, 0) = 10 (pseudo-class counts as class) */
a:hover { }

/* (0, 0, 0, 2) = 2 (pseudo-element counts as element) */
p::before { }

/* (0, 0, 0, 0) = 0 (universal selector has no specificity) */
* { }

/* (0, 0, 0, 0) = 0 (:where() has zero specificity) */
:where(#header, .nav) { }

/* (0, 1, 0, 0) = 100 (:is() uses highest specificity) */
:is(#header, .nav) { }
```

### Specificity Wars:
```css
/* Specificity: 1 */
p { color: red; }

/* Specificity: 10 - Wins */
.text { color: blue; }

/* Specificity: 100 - Wins */
#main { color: green; }

/* Specificity: 111 - Wins */
#main .text p { color: purple; }

/* !important always wins */
p { color: orange !important; }
```

**Best Practices:**
- Keep specificity low
- Use classes, avoid IDs
- Don't nest selectors too deeply
- Avoid `!important`

---

## Summary

Understanding CSS selectors and specificity is crucial for writing maintainable CSS. Use semantic selectors, keep specificity low, and leverage pseudo-classes and pseudo-elements for advanced styling.
