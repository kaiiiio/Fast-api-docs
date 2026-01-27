# CSS Flexbox & Grid - Interview Questions & Answers

## Q31-40: Flexbox and Grid Layout Systems

### Q31. What is Flexbox? Explain main concepts.

**Answer:**

Flexbox is a one-dimensional layout system (row OR column).

```css
.container {
    display: flex;
    
    /* Direction */
    flex-direction: row;  /* row | row-reverse | column | column-reverse */
    
    /* Wrapping */
    flex-wrap: wrap;  /* nowrap | wrap | wrap-reverse */
    
    /* Shorthand */
    flex-flow: row wrap;
    
    /* Main axis alignment */
    justify-content: flex-start;  /* flex-start | flex-end | center | space-between | space-around | space-evenly */
    
    /* Cross axis alignment */
    align-items: stretch;  /* stretch | flex-start | flex-end | center | baseline */
    
    /* Multi-line cross axis */
    align-content: flex-start;  /* Same values as justify-content */
    
    /* Gap */
    gap: 20px;  /* row-gap column-gap */
}

.item {
    /* Grow factor */
    flex-grow: 1;  /* Default 0 */
    
    /* Shrink factor */
    flex-shrink: 1;  /* Default 1 */
    
    /* Base size */
    flex-basis: auto;  /* auto | 200px | 50% */
    
    /* Shorthand */
    flex: 1;  /* flex-grow flex-shrink flex-basis */
    flex: 0 1 auto;  /* Default */
    
    /* Individual alignment */
    align-self: center;  /* auto | flex-start | flex-end | center | baseline | stretch */
    
    /* Order */
    order: 0;  /* Default 0, can be negative */
}
```

### Q32. Common Flexbox Patterns?

**Answer:**

```css
/* Center everything */
.center {
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Space between */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Equal columns */
.columns {
    display: flex;
}
.column {
    flex: 1;  /* Equal width */
}

/* Responsive grid */
.grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}
.grid-item {
    flex: 1 1 300px;  /* Min 300px, grows to fill */
}

/* Sticky footer */
body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}
main {
    flex: 1;  /* Takes remaining space */
}
```

### Q33. What is CSS Grid? Explain main concepts.

**Answer:**

Grid is a two-dimensional layout system (rows AND columns).

```css
.container {
    display: grid;
    
    /* Define columns */
    grid-template-columns: 200px 1fr 2fr;  /* 3 columns */
    grid-template-columns: repeat(3, 1fr);  /* 3 equal columns */
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));  /* Responsive */
    
    /* Define rows */
    grid-template-rows: 100px auto 50px;
    
    /* Gap */
    gap: 20px;  /* row-gap column-gap */
    grid-gap: 20px 10px;  /* Old syntax */
    
    /* Named areas */
    grid-template-areas:
        "header header header"
        "sidebar main main"
        "footer footer footer";
    
    /* Auto flow (how items are placed) */
    grid-auto-flow: row;  /* row | column | dense | row dense | column dense */
    
    /* Auto rows (size of implicit rows) */
    grid-auto-rows: 100px;  /* Fixed size */
    grid-auto-rows: minmax(100px, auto);  /* Min-max */
    grid-auto-rows: 1fr;  /* Flexible */
    
    /* Auto columns (size of implicit columns) */
    grid-auto-columns: 200px;
    
    /* Alignment */
    justify-items: start;  /* start | end | center | stretch */
    align-items: start;
    justify-content: start;
    align-content: start;
}

.item {
    /* Placement */
    grid-column: 1 / 3;  /* Start / End */
    grid-row: 1 / 2;
    
    /* Shorthand */
    /* grid-area: row-start / col-start / row-end / col-end */
    grid-area: 1 / 1 / 3 / 3;
    
    /* Named areas */
    grid-area: header;
    
    /* Span */
    grid-column: span 2;  /* Span 2 columns */
    
    /* Individual alignment */
    justify-self: center;
    align-self: center;
}
```

**Grid Auto Flow & Auto Rows Examples:**

```css
/* Example 1: grid-auto-flow: row (default) */
.grid-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-flow: row;  /* Items fill rows first */
    gap: 10px;
}
/* Result: 
   [1] [2] [3]
   [4] [5] [6]
*/

/* Example 2: grid-auto-flow: column */
.grid-column {
    display: grid;
    grid-template-rows: repeat(3, 100px);
    grid-auto-flow: column;  /* Items fill columns first */
    gap: 10px;
}
/* Result:
   [1] [4]
   [2] [5]
   [3] [6]
*/

/* Example 3: grid-auto-flow: dense (fills gaps) */
.grid-dense {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-flow: dense;  /* Fills empty cells */
    gap: 10px;
}
/* Useful when items have different sizes */

/* Example 4: grid-auto-rows (implicit rows) */
.grid-auto {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 150px;  /* All auto-created rows are 150px */
    gap: 10px;
}

/* Example 5: grid-auto-rows with minmax */
.grid-flexible {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: minmax(100px, auto);  /* Min 100px, grows with content */
    gap: 10px;
}

/* Example 6: Equal height rows */
.grid-equal {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 1fr;  /* All rows equal height */
    gap: 10px;
}

/* Example 7: Masonry-like layout */
.masonry {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    grid-auto-rows: 10px;  /* Small rows for fine control */
    gap: 10px;
}
.masonry-item {
    grid-row: span 10;  /* Span multiple small rows */
}

/* Example 8: Practical use case */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    grid-auto-rows: minmax(200px, auto);  /* Cards at least 200px tall */
    grid-auto-flow: dense;  /* Fill gaps */
    gap: 20px;
}
```

**Tailwind CSS Equivalents:**

```html
<!-- grid-auto-flow -->
<div class="grid grid-flow-row">Row flow (default)</div>
<div class="grid grid-flow-col">Column flow</div>
<div class="grid grid-flow-dense">Dense packing</div>
<div class="grid grid-flow-row-dense">Row dense</div>

<!-- grid-auto-rows -->
<div class="grid auto-rows-auto">Auto height</div>
<div class="grid auto-rows-min">Min content</div>
<div class="grid auto-rows-max">Max content</div>
<div class="grid auto-rows-fr">1fr height</div>

<!-- Custom values -->
<div class="grid" style="grid-auto-rows: 1fr;">Equal rows</div>
<div class="grid" style="grid-auto-rows: minmax(100px, auto);">Min 100px</div>

<!-- Practical example -->
<div class="grid grid-cols-3 auto-rows-min grid-flow-row gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
</div>
```

**When to Use:**

```css
/* Use grid-auto-flow when: */
- You want to control item placement direction
- You need dense packing (fills gaps)
- Building masonry layouts

/* Use grid-auto-rows when: */
- You have dynamic number of rows
- You want consistent row heights
- Content height varies


### Q34. Grid vs Flexbox - When to use which?

**Answer:**

| Feature | Flexbox | Grid |
|---------|---------|------|
| **Dimensions** | 1D (row OR column) | 2D (rows AND columns) |
| **Use Case** | Components, navigation | Page layouts, complex grids |
| **Content** | Content-first | Layout-first |
| **Flexibility** | Items control size | Container controls size |

```css
/* Flexbox: Navigation */
.nav {
    display: flex;
    gap: 20px;
}

/* Grid: Page layout */
.page {
    display: grid;
    grid-template-columns: 200px 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
        "header header"
        "sidebar main"
        "footer footer";
}

/* Flexbox: Card content */
.card {
    display: flex;
    flex-direction: column;
}

/* Grid: Card grid */
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}
```

### Q35. What is `fr` unit in Grid?

**Answer:**

`fr` (fraction) represents a fraction of available space.

```css
/* 3 equal columns */
grid-template-columns: 1fr 1fr 1fr;

/* First column 2x wider */
grid-template-columns: 2fr 1fr 1fr;

/* Fixed + flexible */
grid-template-columns: 200px 1fr 1fr;  /* 200px fixed, rest split equally */

/* With gap */
grid-template-columns: 1fr 1fr;
gap: 20px;
/* Each column = (100% - 20px) / 2 */
```

### Q36. What is `minmax()` in Grid?

**Answer:**

Defines minimum and maximum size range.

```css
/* Column between 200px and 1fr */
grid-template-columns: minmax(200px, 1fr);

/* Responsive grid */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));

/* Rows with min height */
grid-template-rows: minmax(100px, auto);

/* Common pattern */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}
```

### Q37. What is `auto-fit` vs `auto-fill` in Grid?

**Answer:**

```css
/* auto-fill: Creates as many tracks as fit, empty tracks remain */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));

/* auto-fit: Creates tracks but collapses empty ones */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));

/* Difference visible when few items */
/* auto-fill: [item] [item] [empty] [empty] */
/* auto-fit:  [item] [item] (empty tracks collapse, items grow) */
```

### Q38. How to center an element with Flexbox?

**Answer:**

```css
/* Method 1: Container centering */
.container {
    display: flex;
    justify-content: center;  /* Horizontal */
    align-items: center;      /* Vertical */
    min-height: 100vh;
}

/* Method 2: Item centering */
.container {
    display: flex;
}
.item {
    margin: auto;
}

/* Method 3: Single item */
.container {
    display: flex;
}
.item {
    align-self: center;
    justify-self: center;
}
```

### Q39. How to create a responsive grid without media queries?

**Answer:**

```css
/* Auto-responsive grid */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

/* Flexbox alternative */
.flex-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}
.flex-item {
    flex: 1 1 250px;  /* Grow, shrink, min 250px */
}

/* Container queries (modern) */
.container {
    container-type: inline-size;
}
@container (min-width: 700px) {
    .item {
        grid-column: span 2;
    }
}
```

### Q40. What are Grid Template Areas?

**Answer:**

Named grid areas for semantic layouts.

```css
.container {
    display: grid;
    grid-template-columns: 200px 1fr 200px;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
        "header  header  header"
        "sidebar content ads"
        "footer  footer  footer";
    gap: 20px;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.ads     { grid-area: ads; }
.footer  { grid-area: footer; }

/* Responsive */
@media (max-width: 768px) {
    .container {
        grid-template-columns: 1fr;
        grid-template-areas:
            "header"
            "content"
            "sidebar"
            "ads"
            "footer";
    }
}
```

---

## Summary

Flexbox and Grid are powerful modern layout systems. Use Flexbox for one-dimensional layouts and Grid for two-dimensional layouts. Both can be combined for complex designs.
