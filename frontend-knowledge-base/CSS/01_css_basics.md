# CSS Basics - Interview Questions & Answers

## Q1. What is CSS and what does it stand for?

**Answer:**

**CSS** stands for **Cascading Style Sheets**. It's a stylesheet language used to describe the presentation and visual formatting of HTML documents.

**Key Points:**
- **Cascading**: Styles can be inherited and overridden in a specific order
- **Style**: Defines how elements look (colors, fonts, layout)
- **Sheets**: Separate files or embedded styles

**Three Ways to Add CSS:**

```html
<!-- 1. Inline CSS -->
<p style="color: red; font-size: 16px;">Text</p>

<!-- 2. Internal CSS -->
<head>
    <style>
        p { color: blue; }
    </style>
</head>

<!-- 3. External CSS (Best Practice) -->
<head>
    <link rel="stylesheet" href="styles.css">
</head>
```

---

## Q2. What is the CSS Box Model?

**Answer:**

The **Box Model** describes how elements are rendered with content, padding, border, and margin.

```
┌─────────────── Margin ───────────────┐
│ ┌─────────── Border ─────────────┐   │
│ │ ┌───────── Padding ─────────┐  │   │
│ │ │                            │  │   │
│ │ │        Content             │  │   │
│ │ │      (width × height)      │  │   │
│ │ │                            │  │   │
│ │ └────────────────────────────┘  │   │
│ └─────────────────────────────────┘   │
└───────────────────────────────────────┘
```

**CSS:**
```css
.box {
    width: 200px;
    height: 100px;
    padding: 20px;
    border: 5px solid black;
    margin: 10px;
}

/* Total width = 200 + (20*2) + (5*2) + (10*2) = 270px */
/* Total height = 100 + (20*2) + (5*2) + (10*2) = 170px */
```

**box-sizing Property:**
```css
/* Default: content-box */
.box {
    box-sizing: content-box;  /* width/height = content only */
}

/* Better: border-box */
.box {
    box-sizing: border-box;  /* width/height = content + padding + border */
}

/* Global reset (recommended) */
* {
    box-sizing: border-box;
}
```

---

## Q3. What are CSS Selectors? List different types.

**Answer:**

Selectors target HTML elements to apply styles.

### Basic Selectors:
```css
/* Universal selector */
* { margin: 0; }

/* Element selector */
p { color: blue; }

/* Class selector */
.highlight { background: yellow; }

/* ID selector */
#header { font-size: 24px; }

/* Multiple selectors */
h1, h2, h3 { font-family: Arial; }
```

### Combinators:
```css
/* Descendant (space) */
div p { color: red; }  /* All p inside div */

/* Child (>) */
div > p { color: blue; }  /* Direct children only */

/* Adjacent sibling (+) */
h1 + p { margin-top: 0; }  /* p immediately after h1 */

/* General sibling (~) */
h1 ~ p { color: green; }  /* All p siblings after h1 */
```

### Attribute Selectors:
```css
/* Has attribute */
[href] { color: blue; }

/* Exact value */
[type="text"] { border: 1px solid gray; }

/* Contains word */
[class~="button"] { padding: 10px; }

/* Starts with */
[href^="https"] { color: green; }

/* Ends with */
[href$=".pdf"] { color: red; }

/* Contains substring */
[href*="example"] { text-decoration: underline; }
```

### Pseudo-classes:
```css
/* Link states */
a:link { color: blue; }
a:visited { color: purple; }
a:hover { color: red; }
a:active { color: orange; }

/* Form states */
input:focus { border-color: blue; }
input:disabled { opacity: 0.5; }
input:checked { background: green; }

/* Structural */
li:first-child { font-weight: bold; }
li:last-child { margin-bottom: 0; }
li:nth-child(2n) { background: #f0f0f0; }  /* Even */
li:nth-child(odd) { background: white; }   /* Odd */
p:not(.special) { color: gray; }
```

### Pseudo-elements:
```css
/* First letter/line */
p::first-letter { font-size: 2em; }
p::first-line { font-weight: bold; }

/* Before/After */
.icon::before { content: "★"; }
.icon::after { content: " →"; }

/* Selection */
::selection { background: yellow; color: black; }
```

---

## Q4. What is CSS Specificity? How is it calculated?

**Answer:**

**Specificity** determines which CSS rule applies when multiple rules target the same element.

### Specificity Hierarchy (highest to lowest):
1. **Inline styles** - `style="..."`
2. **IDs** - `#id`
3. **Classes, attributes, pseudo-classes** - `.class`, `[attr]`, `:hover`
4. **Elements, pseudo-elements** - `div`, `::before`

### Calculation:
```
(inline, IDs, classes, elements)
```

**Examples:**
```css
/* (0, 0, 0, 1) = 1 */
p { color: red; }

/* (0, 0, 1, 0) = 10 */
.text { color: blue; }

/* (0, 1, 0, 0) = 100 */
#header { color: green; }

/* (1, 0, 0, 0) = 1000 */
<p style="color: purple;">

/* (0, 1, 2, 1) = 121 */
#header .nav a { color: orange; }

/* (0, 0, 2, 2) = 22 */
div.container p.text { color: yellow; }
```

### Specificity Rules:
```css
/* More specific wins */
#header { color: red; }      /* Wins */
.header { color: blue; }

/* Equal specificity: last one wins */
.text { color: red; }
.text { color: blue; }  /* Wins */

/* !important overrides everything (avoid!) */
p { color: red !important; }  /* Wins over everything */
```

**Best Practices:**
- Keep specificity low
- Avoid `!important`
- Use classes over IDs for styling
- Don't use inline styles

---

## Q5. What is the CSS Cascade?

**Answer:**

The **Cascade** determines which styles apply when there are conflicts.

### Cascade Order (highest to lowest priority):
1. **Importance**: `!important` declarations
2. **Specificity**: More specific selectors
3. **Source Order**: Later rules override earlier ones
4. **Origin**: User agent → User → Author

**Example:**
```css
/* 1. Browser default */
p { margin: 16px 0; }

/* 2. External stylesheet */
p { margin: 10px 0; color: black; }

/* 3. Internal stylesheet */
<style>
p { color: blue; }  /* Overrides color */
</style>

/* 4. Inline style */
<p style="color: red;">  /* Overrides all */

/* 5. !important (highest priority) */
p { color: green !important; }  /* Wins */
```

---

## Q6. What are CSS Units? Explain absolute vs relative units.

**Answer:**

### Absolute Units (fixed size):
```css
.element {
    width: 100px;    /* Pixels */
    width: 2.54cm;   /* Centimeters */
    width: 25.4mm;   /* Millimeters */
    width: 1in;      /* Inches (1in = 96px) */
    width: 6pt;      /* Points (1pt = 1/72 inch) */
    width: 12pc;     /* Picas (1pc = 12pt) */
}
```

### Relative Units (relative to something):
```css
.element {
    /* Relative to font size */
    width: 2em;      /* 2× parent font size */
    width: 1.5rem;   /* 1.5× root font size */
    
    /* Relative to viewport */
    width: 50vw;     /* 50% viewport width */
    height: 100vh;   /* 100% viewport height */
    font-size: 5vmin; /* 5% of smaller viewport dimension */
    font-size: 5vmax; /* 5% of larger viewport dimension */
    
    /* Relative to parent */
    width: 50%;      /* 50% of parent width */
    
    /* Relative to line height */
    margin: 2lh;     /* 2× line height */
    
    /* Relative to container */
    width: 50cqw;    /* 50% container query width */
}
```

### em vs rem:
```css
html { font-size: 16px; }

.parent {
    font-size: 20px;
}

.child {
    font-size: 2em;   /* 2 × 20px = 40px */
    padding: 1em;     /* 1 × 40px = 40px (uses own font-size) */
}

.child2 {
    font-size: 2rem;  /* 2 × 16px = 32px (always relative to root) */
    padding: 1rem;    /* 1 × 16px = 16px */
}
```

**Best Practices:**
- Use `rem` for font sizes (consistent scaling)
- Use `em` for padding/margin (scales with element)
- Use `%` for widths (responsive)
- Use `vh/vw` for full-screen sections
- Use `px` for borders, shadows (precision)

---

## Q7. What is the difference between `display: none` and `visibility: hidden`?

**Answer:**

| Property | `display: none` | `visibility: hidden` |
|----------|-----------------|---------------------|
| **Space** | Removed from layout | Occupies space |
| **DOM** | Still in DOM | Still in DOM |
| **Children** | All hidden | Can be visible |
| **Events** | No events | No events |
| **Accessibility** | Hidden from screen readers | Hidden from screen readers |
| **Transition** | Cannot transition | Can transition |

**Examples:**
```css
/* display: none - completely removed */
.hidden {
    display: none;  /* Takes no space */
}

/* visibility: hidden - invisible but takes space */
.invisible {
    visibility: hidden;  /* Takes space */
}

/* opacity: 0 - invisible but interactive */
.transparent {
    opacity: 0;  /* Takes space, receives events */
}
```

**Visual Comparison:**
```html
<div>Box 1</div>
<div style="display: none;">Box 2 (display: none)</div>
<div>Box 3</div>

<!-- Result: Box 1, Box 3 (Box 2 removed) -->

<div>Box 1</div>
<div style="visibility: hidden;">Box 2 (visibility: hidden)</div>
<div>Box 3</div>

<!-- Result: Box 1, [empty space], Box 3 -->
```

**Children Visibility:**
```css
.parent {
    visibility: hidden;
}

.parent .child {
    visibility: visible;  /* Child can be visible! */
}
```

---

## Q8. What are CSS Colors? Different ways to define colors?

**Answer:**

### Named Colors:
```css
.element {
    color: red;
    color: blue;
    color: transparent;
    color: currentColor;  /* Inherits color property */
}
```

### Hexadecimal:
```css
.element {
    color: #ff0000;      /* Red */
    color: #f00;         /* Shorthand */
    color: #ff0000ff;    /* With alpha (RGBA) */
    color: #f00f;        /* Shorthand with alpha */
}
```

### RGB/RGBA:
```css
.element {
    color: rgb(255, 0, 0);           /* Red */
    color: rgba(255, 0, 0, 0.5);     /* 50% transparent red */
    color: rgb(255 0 0 / 0.5);       /* Modern syntax */
}
```

### HSL/HSLA:
```css
.element {
    color: hsl(0, 100%, 50%);        /* Red */
    color: hsla(0, 100%, 50%, 0.5);  /* 50% transparent */
    color: hsl(0 100% 50% / 0.5);    /* Modern syntax */
}

/* HSL: Hue (0-360°), Saturation (0-100%), Lightness (0-100%) */
/* 0° = Red, 120° = Green, 240° = Blue */
```

### Modern Color Functions:
```css
.element {
    /* LCH (perceptually uniform) */
    color: lch(50% 100 0);
    
    /* LAB */
    color: lab(50% 100 0);
    
    /* Color-mix */
    color: color-mix(in srgb, red 50%, blue);
}
```

---

## Q9. What is the `position` property? Explain different values.

**Answer:**

### static (default):
```css
.element {
    position: static;  /* Normal flow, ignores top/right/bottom/left */
}
```

### relative:
```css
.element {
    position: relative;
    top: 10px;     /* Moves 10px down from original position */
    left: 20px;    /* Moves 20px right from original position */
    /* Original space is preserved */
}
```

### absolute:
```css
.parent {
    position: relative;  /* Creates positioning context */
}

.child {
    position: absolute;
    top: 0;
    right: 0;
    /* Positioned relative to nearest positioned ancestor */
    /* Removed from normal flow */
}
```

### fixed:
```css
.element {
    position: fixed;
    top: 0;
    right: 0;
    /* Positioned relative to viewport */
    /* Stays in place when scrolling */
}
```

### sticky:
```css
.element {
    position: sticky;
    top: 0;
    /* Acts like relative until scroll threshold */
    /* Then acts like fixed */
}
```

**Comparison:**
```css
/* Navbar example */
.navbar {
    position: sticky;
    top: 0;
    /* Scrolls normally, sticks to top when reached */
}

/* Modal overlay */
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* Covers entire viewport */
}

/* Tooltip */
.tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    /* Positioned relative to parent */
}
```

---

## Q10. What is `z-index`? How does it work?

**Answer:**

`z-index` controls the stacking order of positioned elements (3D depth).

**Rules:**
- Only works on positioned elements (`position` other than `static`)
- Higher values appear on top
- Creates stacking contexts

```css
.element1 {
    position: relative;
    z-index: 1;  /* Behind */
}

.element2 {
    position: relative;
    z-index: 2;  /* In front */
}

.element3 {
    position: relative;
    z-index: 999;  /* On top */
}
```

**Stacking Context:**
```css
.parent {
    position: relative;
    z-index: 1;
}

.child {
    position: relative;
    z-index: 9999;  /* Still behind other elements with z-index: 2 */
    /* Cannot escape parent's stacking context */
}
```

**Common z-index Scale:**
```css
:root {
    --z-dropdown: 1000;
    --z-sticky: 1020;
    --z-fixed: 1030;
    --z-modal-backdrop: 1040;
    --z-modal: 1050;
    --z-popover: 1060;
    --z-tooltip: 1070;
}
```

**Negative z-index:**
```css
.background {
    position: relative;
    z-index: -1;  /* Behind parent */
}
```

---

## Summary

These 10 questions cover CSS fundamentals including the box model, selectors, specificity, cascade, units, display properties, colors, positioning, and z-index - essential knowledge for any frontend developer.
