# CSS Performance & Best Practices - Interview Questions & Answers

## Q81-90: Performance Optimization and Best Practices

### Q81-85: Performance

**Q81. CSS Performance - What's Expensive?**

```css
/* ❌ Expensive (avoid) */
* { }  /* Universal selector */
div > div > div > p { }  /* Deep nesting */
[class^="icon-"] { }  /* Complex attribute selectors */

/* ✅ Fast */
.class-name { }
#id { }

/* ❌ Expensive properties */
box-shadow: 0 0 50px rgba(0,0,0,0.5);  /* Large blur */
filter: blur(10px);
transform: perspective(1000px) rotateY(45deg);  /* 3D */

/* ✅ GPU Accelerated */
transform: translate(), scale(), rotate()  /* 2D transforms */
opacity
filter: brightness(), contrast()  /* Simple filters */
```

**Q82. Render Performance:**

```css
/* Triggers Layout (expensive) */
width, height, margin, padding, border, top, left, font-size, line-height

/* Triggers Paint (moderate) */
color, background, box-shadow, border-radius, visibility

/* Triggers Composite Only (cheap) */
transform, opacity

/* Best practice */
/* ❌ Bad */
.box:hover {
    width: 300px;  /* Triggers layout */
}

/* ✅ Good */
.box:hover {
    transform: scaleX(1.5);  /* GPU accelerated */
}
```

**Q83. Critical CSS:**

```html
<!-- Inline critical CSS -->
<head>
    <style>
        /* Above-the-fold styles */
        body { margin: 0; font-family: Arial; }
        .header { background: blue; padding: 20px; }
        .hero { height: 100vh; }
    </style>
    
    <!-- Load rest asynchronously -->
    <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="styles.css"></noscript>
</head>
```

**Q84. CSS Loading Optimization:**

```html
<!-- Preload critical CSS -->
<link rel="preload" href="critical.css" as="style">

<!-- Async load non-critical CSS -->
<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'">

/* Reduce file size */
/* Minify CSS */
/* Remove unused CSS (PurgeCSS) */
/* Use CSS compression (gzip/brotli) */

/* Code splitting */
/* Load component CSS only when needed */
```

**Q85. will-change Optimization:**

```css
/* Hint browser to optimize */
.animated-element {
    will-change: transform, opacity;
}

.animated-element:hover {
    transform: scale(1.2);
    opacity: 0.8;
}

/* Don't overuse */
/* ❌ Bad */
* {
    will-change: transform;  /* Too many elements */
}

/* ✅ Good */
.carousel-slide {
    will-change: transform;  /* Specific elements that will animate */
}

/* Remove after animation */
element.addEventListener('animationend', () => {
    element.style.willChange = 'auto';
});
```

### Q86-90: Best Practices

**Q86. CSS Architecture (BEM):**

```css
/* Block Element Modifier */

/* Block */
.card { }

/* Element */
.card__title { }
.card__content { }
.card__button { }

/* Modifier */
.card--large { }
.card--featured { }
.card__button--primary { }

/* Example */
.button { }
.button--primary { }
.button--secondary { }
.button--large { }
.button__icon { }
```

**Q87. CSS Organization:**

```css
/* File structure */
styles/
  ├── base/
  │   ├── reset.css
  │   ├── typography.css
  │   └── variables.css
  ├── components/
  │   ├── button.css
  │   ├── card.css
  │   └── modal.css
  ├── layout/
  │   ├── header.css
  │   ├── footer.css
  │   └── grid.css
  ├── pages/
  │   ├── home.css
  │   └── about.css
  └── utilities/
      ├── spacing.css
      └── colors.css

/* Order in file */
/* 1. Variables */
:root { --primary: blue; }

/* 2. Reset/Base */
* { box-sizing: border-box; }

/* 3. Layout */
.container { max-width: 1200px; }

/* 4. Components */
.button { padding: 10px; }

/* 5. Utilities */
.text-center { text-align: center; }

/* 6. Media queries */
@media (min-width: 768px) { }
```

**Q88. Naming Conventions:**

```css
/* Use meaningful names */
/* ✅ Good */
.primary-button { }
.user-profile { }
.navigation-menu { }

/* ❌ Bad */
.btn1 { }
.div2 { }
.red-box { }  /* Describes style, not purpose */

/* Utility classes */
.mt-1 { margin-top: 0.25rem; }
.text-center { text-align: center; }
.flex { display: flex; }

/* State classes */
.is-active { }
.is-disabled { }
.is-loading { }
.has-error { }
```

**Q89. CSS Reset vs Normalize:**

```css
/* CSS Reset - Remove all default styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Normalize.css - Consistent defaults across browsers */
/* Preserves useful defaults */
/* Corrects bugs */
/* Improves usability */

/* Modern reset */
*, *::before, *::after {
    box-sizing: border-box;
}

* {
    margin: 0;
}

html, body {
    height: 100%;
}

body {
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
}

img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
}

input, button, textarea, select {
    font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
}
```

**Q90. Common CSS Mistakes to Avoid:**

```css
/* ❌ 1. Overusing !important */
.text { color: red !important; }

/* ✅ Use proper specificity */
.container .text { color: red; }

/* ❌ 2. Magic numbers */
.element { margin-top: 37px; }

/* ✅ Use variables */
.element { margin-top: var(--spacing-lg); }

/* ❌ 3. Hardcoded colors */
.button { background: #3498db; }

/* ✅ Use variables */
.button { background: var(--primary-color); }

/* ❌ 4. Not using shorthand */
margin-top: 10px;
margin-right: 20px;
margin-bottom: 10px;
margin-left: 20px;

/* ✅ Use shorthand */
margin: 10px 20px;

/* ❌ 5. Inline styles */
<div style="color: red; font-size: 16px;">

/* ✅ Use classes */
<div class="error-text">

/* ❌ 6. Deep nesting */
.header .nav ul li a span { }

/* ✅ Flatten */
.nav-link-text { }

/* ❌ 7. Not mobile-first */
.container { width: 1200px; }
@media (max-width: 768px) { .container { width: 100%; } }

/* ✅ Mobile-first */
.container { width: 100%; }
@media (min-width: 768px) { .container { width: 1200px; } }
```

---

## Summary

CSS performance focuses on selector efficiency, GPU-accelerated properties, critical CSS, and loading optimization. Best practices include BEM methodology, proper organization, meaningful naming, and avoiding common mistakes like overusing !important and deep nesting.
