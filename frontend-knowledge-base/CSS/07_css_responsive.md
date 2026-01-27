# CSS Responsive Design & Media Queries - Interview Questions & Answers

## Q61-70: Responsive Design, Media Queries, and Mobile-First

### Q61-65: Media Queries

**Q61. What are Media Queries?**

```css
/* Basic syntax */
@media media-type and (condition) {
    /* CSS rules */
}

/* Common breakpoints */
/* Mobile first */
@media (min-width: 576px) { /* Small devices */ }
@media (min-width: 768px) { /* Tablets */ }
@media (min-width: 992px) { /* Desktops */ }
@media (min-width: 1200px) { /* Large desktops */ }

/* Desktop first */
@media (max-width: 1199px) { /* < Large desktop */ }
@media (max-width: 991px) { /* < Desktop */ }
@media (max-width: 767px) { /* < Tablet */ }
@media (max-width: 575px) { /* Mobile */ }
```

**Q62. Media Query Features:**

```css
/* Width/Height */
@media (min-width: 768px) { }
@media (max-width: 1200px) { }
@media (width: 500px) { }  /* Exact */

/* Orientation */
@media (orientation: portrait) { }
@media (orientation: landscape) { }

/* Aspect Ratio */
@media (aspect-ratio: 16/9) { }
@media (min-aspect-ratio: 16/9) { }

/* Resolution */
@media (min-resolution: 2dppx) { /* Retina */ }
@media (min-resolution: 192dpi) { }

/* Hover capability */
@media (hover: hover) { /* Has hover */ }
@media (hover: none) { /* Touch devices */ }

/* Pointer precision */
@media (pointer: fine) { /* Mouse */ }
@media (pointer: coarse) { /* Touch */ }

/* Color scheme */
@media (prefers-color-scheme: dark) { }
@media (prefers-color-scheme: light) { }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    * {
        animation: none !important;
        transition: none !important;
    }
}

/* Print */
@media print { }

/* Screen */
@media screen { }
```

**Q63. Combining Media Queries:**

```css
/* AND */
@media (min-width: 768px) and (max-width: 1024px) { }

/* OR (comma-separated) */
@media (max-width: 767px), (min-width: 1200px) { }

/* NOT */
@media not print { }

/* Complex */
@media screen and (min-width: 768px) and (orientation: landscape) { }

/* Range syntax (modern) */
@media (768px <= width <= 1024px) { }
@media (width >= 768px) { }
```

**Q64. Mobile-First vs Desktop-First:**

```css
/* Mobile-First (recommended) */
.container {
    width: 100%;  /* Mobile default */
}

@media (min-width: 768px) {
    .container {
        width: 750px;  /* Tablet */
    }
}

@media (min-width: 992px) {
    .container {
        width: 970px;  /* Desktop */
    }
}

/* Desktop-First */
.container {
    width: 1200px;  /* Desktop default */
}

@media (max-width: 991px) {
    .container {
        width: 970px;  /* Tablet */
    }
}

@media (max-width: 767px) {
    .container {
        width: 100%;  /* Mobile */
    }
}
```

**Q65. Container Queries (Modern):**

```css
/* Container */
.card-container {
    container-type: inline-size;
    container-name: card;
}

/* Query container instead of viewport */
@container card (min-width: 400px) {
    .card {
        display: grid;
        grid-template-columns: 1fr 2fr;
    }
}

@container (min-width: 600px) {
    .card-title {
        font-size: 2rem;
    }
}
```

### Q66-70: Responsive Techniques

**Q66. Responsive Units:**

```css
/* Viewport units */
width: 100vw;  /* 100% viewport width */
height: 100vh;  /* 100% viewport height */
font-size: 5vmin;  /* 5% of smaller dimension */
font-size: 5vmax;  /* 5% of larger dimension */

/* Relative units */
font-size: 1rem;  /* Relative to root */
padding: 1em;  /* Relative to element font-size */
width: 50%;  /* Relative to parent */

/* Clamp (responsive without media queries) */
font-size: clamp(1rem, 2.5vw, 2rem);  /* min, preferred, max */
/* preferred is used if between min/max; otherwise clamps to bounds */

width: clamp(300px, 50%, 800px);
```

**Q67. Responsive Typography:**

```css
/* Fluid typography */
html {
    font-size: 16px;
}

@media (min-width: 768px) {
    html {
        font-size: 18px;
    }
}

@media (min-width: 1200px) {
    html {
        font-size: 20px;
    }
}

/* Using clamp */
html {
    font-size: clamp(16px, 1.5vw, 20px);
}

h1 {
    font-size: clamp(2rem, 5vw, 4rem);
}

/* Using calc */
font-size: calc(16px + 0.5vw);
```

**Q68. Responsive Images:**

```html
<!-- srcset for different sizes -->
<img 
    src="small.jpg"
    srcset="small.jpg 480w, medium.jpg 768w, large.jpg 1200w"  /* w = image width in px */
    sizes="(max-width: 768px) 100vw, 50vw"  /* media condition | slot width */
    alt="Responsive image"
>

<!-- picture element -->
<picture>
    <source media="(min-width: 1200px)" srcset="large.jpg">
    <source media="(min-width: 768px)" srcset="medium.jpg">
    <img src="small.jpg" alt="Image">
</picture>

<!-- CSS -->
<style>
img {
    max-width: 100%;
    height: auto;
}

/* Background images */
.hero {
    background-image: url('small.jpg');
}

@media (min-width: 768px) {
    .hero {
        background-image: url('large.jpg');
    }
}
</style>
```

**Q69. Responsive Grid Patterns:**

```css
/* Auto-fit grid */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

/* Responsive columns */
.columns {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

@media (min-width: 768px) {
    .columns {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1200px) {
    .columns {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* Flexbox responsive */
.flex-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}

.flex-item {
    flex: 1 1 300px;  /* Grow, shrink, min 300px */
}
```

**Q70. Mobile Navigation Patterns:**

```css
/* Mobile menu */
.nav {
    display: none;  /* Hidden on mobile */
}

.nav.active {
    display: block;
}

.hamburger {
    display: block;
}

@media (min-width: 768px) {
    .nav {
        display: flex !important;  /* Always visible */
    }
    
    .hamburger {
        display: none;  /* Hide hamburger */
    }
}

/* Off-canvas menu */
.sidebar {
    position: fixed;
    left: -250px;
    width: 250px;
    transition: left 0.3s;
}

.sidebar.open {
    left: 0;
}

@media (min-width: 992px) {
    .sidebar {
        position: static;
        left: 0;
    }
}
```

---

## Summary

Responsive design uses media queries, flexible units, and responsive patterns. Mobile-first approach is recommended. Use `clamp()` for fluid typography, container queries for component-based responsiveness, and prefer `min-width` media queries.
