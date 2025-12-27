# CSS Box Model & Layout - Interview Questions & Answers

## Q21-30: Box Model, Display, Float, and Layout Fundamentals

### Q21. Explain the CSS Box Model in detail.

**Answer:** The box model consists of content, padding, border, and margin.

```css
.box {
    width: 200px;           /* Content width */
    height: 100px;          /* Content height */
    padding: 20px;          /* Space inside border */
    border: 5px solid black; /* Border */
    margin: 10px;           /* Space outside border */
}

/* box-sizing changes calculation */
.border-box {
    box-sizing: border-box;  /* width includes padding + border */
    width: 200px;            /* Total width = 200px */
}

.content-box {
    box-sizing: content-box; /* width is content only (default) */
    width: 200px;            /* Total width = 200 + padding + border */
}
```

### Q22. What is the difference between `margin` and `padding`?

**Answer:**
- **Margin**: Space OUTSIDE border (transparent, collapses vertically)
- **Padding**: Space INSIDE border (inherits background)

```css
.element {
    margin: 20px;   /* Outside spacing */
    padding: 10px;  /* Inside spacing */
    background: blue; /* Padding gets background, margin doesn't */
}

/* Margin collapse */
.box1 { margin-bottom: 30px; }
.box2 { margin-top: 20px; }
/* Actual space between = 30px (larger wins), not 50px */
```

### Q23. What are the different values of the `display` property?

**Answer:**

```css
/* Block: Full width, new line */
display: block;

/* Inline: Content width, same line, no width/height */
display: inline;

/* Inline-block: Same line but can set width/height */
display: inline-block;

/* Flex: Flexible box layout */
display: flex;

/* Grid: Grid layout */
display: grid;

/* None: Removed from layout */
display: none;

/* Table display values */
display: table;
display: table-row;
display: table-cell;

/* Modern values */
display: contents;  /* Element disappears, children remain */
display: flow-root; /* Creates block formatting context */
```

### Q24. What is `float` and how does it work?

**Answer:**

```css
/* Float elements */
.left { float: left; }
.right { float: right; }

/* Clear floats */
.clear { clear: both; }

/* Clearfix (container) */
.clearfix::after {
    content: "";
    display: table;
    clear: both;
}
```

**Problems with float:**
- Parent collapses if all children float
- Elements wrap around floated elements
- Modern alternative: Flexbox/Grid

### Q25. What is a Block Formatting Context (BFC)?

**Answer:**

BFC is an isolated rendering region where layout rules apply.

**Creates BFC:**
```css
overflow: hidden;
overflow: auto;
display: flow-root;  /* Best method */
display: inline-block;
position: absolute;
position: fixed;
float: left/right;
```

**Benefits:**
- Contains floats
- Prevents margin collapse
- Prevents text wrapping around floats

### Q26. What is margin collapsing?

**Answer:**

Vertical margins collapse (combine) between adjacent elements.

```css
.box1 { margin-bottom: 30px; }
.box2 { margin-top: 20px; }
/* Actual space = 30px (larger wins) */

/* Prevent collapse */
.parent {
    overflow: hidden;  /* Creates BFC */
    /* or */
    padding: 1px 0;    /* Separates margins */
    /* or */
    border: 1px solid transparent;
}
```

### Q27. What is the difference between `width: auto` and `width: 100%`?

**Answer:**

```css
/* width: auto (default) */
.auto {
    width: auto;  /* Fills available space, respects padding/border */
}

/* width: 100% */
.full {
    width: 100%;  /* 100% of parent, may overflow with padding/border */
    padding: 20px; /* Total width = 100% + 40px (overflow!) */
}

/* Solution */
.full-safe {
    width: 100%;
    box-sizing: border-box;  /* Includes padding in width */
    padding: 20px;
}
```

### Q28. What is `overflow` property?

**Answer:**

```css
/* Visible (default): Content overflows */
overflow: visible;

/* Hidden: Clips overflow */
overflow: hidden;

/* Scroll: Always shows scrollbars */
overflow: scroll;

/* Auto: Scrollbars only when needed */
overflow: auto;

/* Separate axes */
overflow-x: hidden;
overflow-y: auto;

/* Modern */
overflow: clip;  /* Like hidden but no scroll container */
```

### Q29. What is `min-width`, `max-width`, `min-height`, `max-height`?

**Answer:**

```css
.responsive {
    width: 100%;
    max-width: 1200px;  /* Never wider than 1200px */
    min-width: 320px;   /* Never narrower than 320px */
}

.image {
    width: 100%;
    height: auto;
    max-height: 500px;  /* Limit height */
    object-fit: cover;  /* Maintain aspect ratio */
}

/* Responsive container */
.container {
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;
}
```

### Q30. What is the `object-fit` property?

**Answer:**

Controls how `<img>` or `<video>` content fits in container.

```css
/* Fill container (default, may distort) */
object-fit: fill;

/* Maintain aspect ratio, may crop */
object-fit: cover;

/* Maintain aspect ratio, may have empty space */
object-fit: contain;

/* Don't resize */
object-fit: none;

/* Fit down only */
object-fit: scale-down;

/* Position within container */
object-position: center;
object-position: top right;
object-position: 50% 50%;
```

**Example:**
```css
.avatar {
    width: 100px;
    height: 100px;
    object-fit: cover;  /* Crop to fill square */
    object-position: center;
}

.hero-image {
    width: 100%;
    height: 400px;
    object-fit: cover;
    object-position: center top;
}
```

---

## Summary

Box model, display properties, floats, and layout fundamentals are essential for understanding CSS layout. Modern layouts prefer Flexbox and Grid over floats.
