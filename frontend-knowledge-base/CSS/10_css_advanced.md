# CSS Advanced Topics - Interview Questions & Answers

## Q91-100: Advanced CSS Techniques and Modern Features

### Q91-95: Advanced Selectors and Techniques

**Q91. :has() - Parent Selector:**

```css
/* Style parent based on children */
.card:has(img) {
    padding: 0;
}

.form:has(input:invalid) {
    border-color: red;
}

/* Multiple conditions */
article:has(h2):has(img) {
    display: grid;
}

/* Sibling selection */
h2:has(+ p) {
    margin-bottom: 0.5rem;
}

/* Practical examples */
/* Card with image */
.card:has(.card__image) {
    grid-template-rows: 200px auto;
}

/* Form with errors */
.form-group:has(input:invalid) {
    background: #fee;
}

/* Empty state */
.list:not(:has(li)) {
    display: none;
}
```

**Q92. Subgrid:**

```css
/* Parent grid */
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

/* Child inherits parent grid */
.grid-item {
    display: grid;
    grid-template-rows: subgrid;  /* Aligns with parent rows */
}

/* Practical use */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.card {
    display: grid;
    grid-template-rows: subgrid;
    grid-row: span 3;
}

.card__image { grid-row: 1; }
.card__title { grid-row: 2; }
.card__content { grid-row: 3; }
```

**Q93. CSS Filters:**

```css
/* Filter functions */
filter: blur(5px);
filter: brightness(150%);
filter: contrast(200%);
filter: grayscale(100%);
filter: hue-rotate(90deg);
filter: invert(100%);
filter: opacity(50%);
filter: saturate(200%);
filter: sepia(100%);
filter: drop-shadow(10px 10px 5px rgba(0,0,0,0.5));

/* Multiple filters */
filter: brightness(110%) contrast(120%) saturate(130%);

/* Backdrop filter (blur background) */
.modal {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.8);
}

/* Image effects */
img:hover {
    filter: grayscale(0%) brightness(110%);
    transition: filter 0.3s;
}

/* Dark mode invert */
@media (prefers-color-scheme: dark) {
    img {
        filter: invert(1) hue-rotate(180deg);
    }
}
```

**Q94. CSS Shapes:**

```css
/* clip-path */
.triangle {
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.circle {
    clip-path: circle(50%);
}

.hexagon {
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}

/* shape-outside (text wrapping) */
.float-image {
    float: left;
    shape-outside: circle(50%);
    clip-path: circle(50%);
}

/* Complex shapes */
.custom-shape {
    clip-path: path('M 0,0 L 100,0 L 100,100 L 0,100 Z');
}
```

**Q95. CSS Scroll Snap:**

```css
/* Container */
.scroll-container {
    scroll-snap-type: x mandatory;  /* x | y | both */
    overflow-x: scroll;
    display: flex;
}

/* Children */
.scroll-item {
    scroll-snap-align: start;  /* start | center | end */
    scroll-snap-stop: always;  /* normal | always */
    flex-shrink: 0;
    width: 100%;
}

/* Carousel example */
.carousel {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
}

.carousel-item {
    flex: 0 0 100%;
    scroll-snap-align: center;
}
```

### Q96-100: Modern CSS Features

**Q96. CSS Containment:**

```css
/* Optimize rendering */
.card {
    contain: layout;  /* Isolate layout */
    contain: paint;   /* Isolate paint */
    contain: size;    /* Fixed size */
    contain: style;   /* Isolate CSS counters */
    
    /* Shorthand */
    contain: layout paint;
    contain: strict;  /* All containment */
    contain: content; /* layout + paint + style */
}

/* content-visibility (performance) */
.long-list-item {
    content-visibility: auto;  /* Render only when visible */
}
```

**Q97. CSS Math Functions:**

```css
/* calc() */
width: calc(100% - 50px);
font-size: calc(1rem + 2vw);
padding: calc(var(--spacing) * 2);

/* min() */
width: min(100%, 1200px);  /* Smaller of two */
padding: min(5%, 20px);

/* max() */
width: max(50%, 300px);  /* Larger of two */
font-size: max(16px, 1rem);

/* clamp() */
font-size: clamp(1rem, 2.5vw, 2rem);  /* min, preferred, max */
width: clamp(300px, 50%, 800px);
padding: clamp(10px, 5%, 50px);

/* Complex calculations */
width: calc(100% / 3 - 20px);
margin: calc((100vw - min(100%, 1200px)) / 2);
```

**Q98. CSS Logical Properties:**

```css
/* Physical properties (old) */
margin-left: 20px;
margin-right: 20px;
border-top: 1px solid;

/* Logical properties (new, RTL-friendly) */
margin-inline-start: 20px;  /* LTR: left, RTL: right */
margin-inline-end: 20px;    /* LTR: right, RTL: left */
margin-block-start: 10px;   /* top */
margin-block-end: 10px;     /* bottom */

/* Shorthand */
margin-inline: 20px;  /* start + end */
margin-block: 10px;   /* start + end */
padding-inline: 20px;
padding-block: 10px;

/* Border */
border-inline-start: 1px solid;
border-block-start: 1px solid;

/* Size */
inline-size: 100%;  /* width in LTR */
block-size: 50px;   /* height */
```

**Q99. CSS Grid Advanced:**

```css
/* Dense packing */
.grid {
    display: grid;
    grid-auto-flow: dense;  /* Fill gaps */
}

/* Masonry layout (experimental) */
.masonry {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    grid-template-rows: masonry;  /* Experimental */
}

/* Named lines */
.grid {
    display: grid;
    grid-template-columns: [start] 1fr [middle] 2fr [end];
    grid-template-rows: [header-start] auto [header-end content-start] 1fr [content-end];
}

.item {
    grid-column: start / middle;
    grid-row: header-start / header-end;
}

/* Implicit grid */
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 100px;  /* Implicit rows */
    grid-auto-flow: row;    /* row | column | dense */
}
```

**Q100. CSS Houdini (Paint API):**

```javascript
// Register custom paint worklet
CSS.paintWorklet.addModule('my-paint.js');

// CSS
.element {
    background: paint(myPainter);
    --my-color: red;
}

// my-paint.js
class MyPainter {
    static get inputProperties() {
        return ['--my-color'];
    }
    
    paint(ctx, size, props) {
        const color = props.get('--my-color');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size.width, size.height);
    }
}

registerPaint('myPainter', MyPainter);

/* Custom properties and values */
CSS.registerProperty({
    name: '--my-color',
    syntax: '<color>',
    inherits: false,
    initialValue: 'black'
});

/* Typed OM */
element.attributeStyleMap.set('opacity', CSS.number(0.5));
element.attributeStyleMap.set('width', CSS.px(100));
```

---

## Bonus: CSS Interview Tips

### Common Patterns:

```css
/* Centering */
.center {
    display: grid;
    place-items: center;
}

/* Aspect ratio box */
.aspect-box {
    aspect-ratio: 16 / 9;
}

/* Truncate text */
.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Multi-line truncate */
.truncate-multi {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* Smooth scrolling */
html {
    scroll-behavior: smooth;
}

/* Hide scrollbar */
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* Custom scrollbar */
::-webkit-scrollbar {
    width: 10px;
}
::-webkit-scrollbar-track {
    background: #f1f1f1;
}
::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 5px;
}

/* Focus visible (accessibility) */
button:focus-visible {
    outline: 2px solid blue;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## Summary

Advanced CSS includes modern features like :has(), subgrid, filters, scroll snap, containment, math functions, logical properties, and CSS Houdini. These features enable powerful layouts and effects while maintaining performance and accessibility.

**Key Takeaways:**
- Use :has() for parent selection
- Leverage CSS Grid subgrid for alignment
- Apply filters for visual effects
- Implement scroll snap for carousels
- Use logical properties for internationalization
- Optimize with containment and content-visibility
- Master math functions (calc, clamp, min, max)
- Explore CSS Houdini for custom rendering
