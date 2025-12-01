# CSS Fundamentals with Visual Examples

Complete CSS guide with visual representations for interview preparation.

## 1. Display: inline vs block vs inline-block

### Question
How do inline, block, and inline-block display properties work?

### Solution

```css
/* Inline */
.inline {
    display: inline;
    /* Takes only content width */
    /* No width/height */
    /* Margin/padding only horizontal */
}

/* Block */
.block {
    display: block;
    /* Takes full width */
    /* Can set width/height */
    /* Full margin/padding */
}

/* Inline-block */
.inline-block {
    display: inline-block;
    /* Takes content width (like inline) */
    /* Can set width/height (like block) */
    /* Full margin/padding */
}
```

### Visual Representation

```
INLINE:
┌─────────────────────────────────────┐
│ [Hello] [World] [Test]              │
│  ↑       ↑       ↑                   │
│  Only content width, side by side    │
└─────────────────────────────────────┘

BLOCK:
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │        Hello                     │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │        World                     │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │        Test                      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
Each takes full width, stacked vertically

INLINE-BLOCK:
┌─────────────────────────────────────┐
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │Hello │ │World │ │Test  │         │
│ └──────┘ └──────┘ └──────┘         │
│  ↑         ↑         ↑              │
│  Can set width, but side by side    │
└─────────────────────────────────────┘
```

---

## 2. Flexbox: flex-1 and flex-col

### Question
How do flex-1 and flex-col work in Flexbox?

### Solution

```css
/* Flex container */
.flex-container {
    display: flex;
    flex-direction: row; /* Default: horizontal */
}

.flex-col {
    display: flex;
    flex-direction: column; /* Vertical */
}

/* Flex items */
.flex-1 {
    flex: 1; /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
}

.flex-2 {
    flex: 2; /* Takes 2x space */
}
```

### Visual Representation

```
FLEX ROW (default):
┌─────────────────────────────────────┐
│ ┌──────┐ ┌──────────┐ ┌──────┐    │
│ │Item1 │ │  Item2   │ │Item3 │    │
│ │      │ │ (flex-1) │ │      │    │
│ └──────┘ └──────────┘ └──────┘    │
│   Fixed    Grows to fill    Fixed   │
└─────────────────────────────────────┘

FLEX COLUMN:
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │           Item1                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │           Item2 (flex-1)        │ │
│ │        Grows to fill            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │           Item3                  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

FLEX-1 EXPLANATION:
flex: 1 = flex-grow: 1 + flex-shrink: 1 + flex-basis: 0

┌─────────────────────────────────────┐
│ Available space divided equally      │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │  1/3 │ │  1/3 │ │  1/3 │        │
│ │flex-1│ │flex-1│ │flex-1│        │
│ └──────┘ └──────┘ └──────┘        │
└─────────────────────────────────────┘
```

---

## 3. Flexbox Properties

### Question
Complete guide to Flexbox properties.

### Solution

```css
.container {
    display: flex;
    
    /* Direction */
    flex-direction: row | row-reverse | column | column-reverse;
    
    /* Wrapping */
    flex-wrap: nowrap | wrap | wrap-reverse;
    
    /* Main axis alignment */
    justify-content: flex-start | flex-end | center | space-between | space-around | space-evenly;
    
    /* Cross axis alignment */
    align-items: flex-start | flex-end | center | baseline | stretch;
    
    /* Multiple lines alignment */
    align-content: flex-start | flex-end | center | space-between | space-around | stretch;
}

.item {
    /* Growth */
    flex-grow: 0; /* Default: don't grow */
    flex-grow: 1; /* Grow to fill space */
    
    /* Shrink */
    flex-shrink: 1; /* Default: can shrink */
    flex-shrink: 0; /* Don't shrink */
    
    /* Basis */
    flex-basis: auto; /* Default: content size */
    flex-basis: 200px; /* Initial size */
    
    /* Shorthand */
    flex: 1; /* grow: 1, shrink: 1, basis: 0 */
    flex: 1 1 auto; /* grow, shrink, basis */
    
    /* Alignment */
    align-self: auto | flex-start | flex-end | center | baseline | stretch;
}
```

### Visual Examples

```
JUSTIFY-CONTENT:

flex-start:     [Item1][Item2][Item3]        │
center:            [Item1][Item2][Item3]     │
flex-end:                        [Item1][Item2][Item3]
space-between:  [Item1]    [Item2]    [Item3]
space-around:   [Item1]  [Item2]  [Item3]
space-evenly:  [Item1] [Item2] [Item3]

ALIGN-ITEMS (cross axis):

┌─────────────────────────────────────┐
│ flex-start:                         │
│ [Item1]                             │
│ [Item2]                             │
│ [Item3]                             │
│                                     │
│ center:                             │
│                                     │
│ [Item1]                             │
│ [Item2]                             │
│ [Item3]                             │
│                                     │
│ flex-end:                           │
│                                     │
│ [Item1]                             │
│ [Item2]                             │
│ [Item3]                             │
└─────────────────────────────────────┘
```

---

## 4. Grid Layout

### Question
How does CSS Grid work?

### Solution

```css
.container {
    display: grid;
    grid-template-columns: 200px 1fr 200px;
    grid-template-rows: auto 1fr auto;
    gap: 20px;
    
    /* Shorthand */
    grid-template: 
        "header header header" auto
        "sidebar main aside" 1fr
        "footer footer footer" auto
        / 200px 1fr 200px;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }
```

### Visual Representation

```
GRID LAYOUT:

┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │         HEADER                  │ │
│ └─────────────────────────────────┘ │
│ ┌──────┐ ┌──────────┐ ┌──────┐    │
│ │      │ │          │ │      │    │
│ │SIDE  │ │   MAIN   │ │ASIDE │    │
│ │BAR   │ │          │ │      │    │
│ │200px │ │   1fr    │ │200px │    │
│ │      │ │          │ │      │    │
│ └──────┘ └──────────┘ └──────┘    │
│ ┌─────────────────────────────────┐ │
│ │         FOOTER                  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 5. Position Properties

### Question
How do position: static, relative, absolute, fixed, sticky work?

### Solution

```css
.static {
    position: static; /* Default */
    /* Normal document flow */
}

.relative {
    position: relative;
    top: 10px;
    left: 20px;
    /* Offset from normal position */
}

.absolute {
    position: absolute;
    top: 0;
    right: 0;
    /* Positioned relative to nearest positioned ancestor */
}

.fixed {
    position: fixed;
    top: 0;
    right: 0;
    /* Positioned relative to viewport */
}

.sticky {
    position: sticky;
    top: 0;
    /* Sticks when scrolling */
}
```

### Visual Representation

```
STATIC (default):
┌─────────────────────────────────────┐
│ [Item1] [Item2] [Item3]            │
│ Normal flow, no positioning         │
└─────────────────────────────────────┘

RELATIVE:
┌─────────────────────────────────────┐
│ [Item1]                             │
│        [Item2] ← offset from normal │
│ [Item3]                             │
└─────────────────────────────────────┘

ABSOLUTE:
┌─────────────────────────────────────┐
│ [Item1]                    [Item2]  │
│              ↑                      │
│         Positioned relative        │
│         to parent                   │
│ [Item3]                             │
└─────────────────────────────────────┘

FIXED:
┌─────────────────────────────────────┐
│ [Item1]                    [Fixed]  │
│              ↑                      │
│         Stays in viewport           │
│         even when scrolling         │
│ [Item3]                             │
└─────────────────────────────────────┘

STICKY:
┌─────────────────────────────────────┐
│ [Sticky] ← Sticks to top when       │
│            scrolling                 │
│ [Item2]                             │
│ [Item3]                             │
└─────────────────────────────────────┘
```

---

## 6. Box Model

### Question
How does the CSS box model work?

### Solution

```css
.box {
    width: 200px;
    height: 100px;
    padding: 20px;
    border: 5px solid black;
    margin: 10px;
    
    /* Box sizing */
    box-sizing: content-box; /* Default */
    box-sizing: border-box; /* Includes padding and border */
}
```

### Visual Representation

```
CONTENT-BOX (default):
┌─────────────────────────────────────┐
│ Margin (10px)                        │
│ ┌─────────────────────────────────┐ │
│ │ Border (5px)                    │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Padding (20px)              │ │ │
│ │ │ ┌─────────────────────────┐ │ │ │
│ │ │ │ Content (200x100)       │ │ │ │
│ │ │ └─────────────────────────┘ │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
Total width: 200 + 20*2 + 5*2 + 10*2 = 270px

BORDER-BOX:
┌─────────────────────────────────────┐
│ Margin (10px)                        │
│ ┌─────────────────────────────────┐ │
│ │ Border (5px) + Padding (20px)   │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Content (auto)             │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
Total width: 200px (includes padding & border)
```

---

## 7. Z-Index and Stacking Context

### Question
How does z-index and stacking context work?

### Solution

```css
.layer1 {
    position: relative;
    z-index: 1;
}

.layer2 {
    position: relative;
    z-index: 2; /* Above layer1 */
}

.layer3 {
    position: relative;
    z-index: 3; /* Above layer2 */
}
```

### Visual Representation

```
STACKING ORDER (top to bottom):

┌─────────────────────────────────────┐
│         Layer 3 (z-index: 3)        │ ← Top
│ ┌─────────────────────────────────┐ │
│ │     Layer 2 (z-index: 2)       │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │  Layer 1 (z-index: 1)        │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Key Concepts

1. **Display**: inline, block, inline-block, flex, grid
2. **Flexbox**: flex-1, flex-col, justify-content, align-items
3. **Grid**: Template areas, columns, rows
4. **Position**: static, relative, absolute, fixed, sticky
5. **Box Model**: content-box, border-box
6. **Z-Index**: Stacking context

## Best Practices

- ✅ Use flexbox for 1D layouts
- ✅ Use grid for 2D layouts
- ✅ Use border-box for predictable sizing
- ✅ Understand stacking context
- ✅ Use semantic HTML
- ✅ Mobile-first approach

