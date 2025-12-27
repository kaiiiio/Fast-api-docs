# CSS Preprocessors & Modern CSS - Interview Questions & Answers

## Q71-80: SASS, CSS Variables, and Modern Features

### Q71-75: CSS Variables (Custom Properties)

**Q71. CSS Variables:**

```css
/* Define variables */
:root {
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --font-size: 16px;
    --spacing: 20px;
}

/* Use variables */
.button {
    background: var(--primary-color);
    font-size: var(--font-size);
    padding: var(--spacing);
}

/* Fallback value */
color: var(--text-color, #333);

/* Computed values */
.element {
    --size: 100px;
    width: var(--size);
    height: calc(var(--size) * 2);
}
```

**Q72. CSS Variables vs SASS Variables:**

| Feature | CSS Variables | SASS Variables |
|---------|---------------|----------------|
| **Runtime** | Dynamic (runtime) | Static (compile-time) |
| **Scope** | Can be scoped | Global or local |
| **JavaScript** | Can be changed | Cannot be changed |
| **Browser** | Modern browsers | Works everywhere (compiled) |
| **Cascade** | Follows cascade | No cascade |

```css
/* CSS Variables - Dynamic */
:root { --color: blue; }
.dark-mode { --color: white; }
.element { color: var(--color); }

/* SASS Variables - Static */
$color: blue;
.element { color: $color; }
```

**Q73. Dynamic Theming with CSS Variables:**

```css
/* Light theme (default) */
:root {
    --bg-color: #ffffff;
    --text-color: #333333;
    --primary: #3498db;
}

/* Dark theme */
[data-theme="dark"] {
    --bg-color: #1a1a1a;
    --text-color: #ffffff;
    --primary: #5dade2;
}

/* Usage */
body {
    background: var(--bg-color);
    color: var(--text-color);
}

.button {
    background: var(--primary);
}

/* JavaScript toggle */
document.body.dataset.theme = 'dark';
```

**Q74. CSS Variables with JavaScript:**

```javascript
// Get variable
const primary = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary-color');

// Set variable
document.documentElement.style
    .setProperty('--primary-color', '#e74c3c');

// Remove variable
document.documentElement.style
    .removeProperty('--primary-color');

// Scoped variables
element.style.setProperty('--local-var', 'value');
```

**Q75. Advanced CSS Variable Techniques:**

```css
/* Responsive variables */
:root {
    --spacing: 10px;
}

@media (min-width: 768px) {
    :root {
        --spacing: 20px;
    }
}

/* Component-scoped */
.card {
    --card-padding: 20px;
    --card-bg: white;
    padding: var(--card-padding);
    background: var(--card-bg);
}

.card.large {
    --card-padding: 40px;
}

/* Calculations */
:root {
    --base-size: 16px;
    --scale: 1.5;
}

h1 {
    font-size: calc(var(--base-size) * var(--scale) * var(--scale));
}
```

### Q76-80: SASS/SCSS

**Q76. SASS Features:**

```scss
// Variables
$primary-color: #3498db;
$font-stack: Arial, sans-serif;

// Nesting
.nav {
    background: $primary-color;
    
    ul {
        list-style: none;
        
        li {
            display: inline-block;
            
            a {
                color: white;
                
                &:hover {
                    color: lighten($primary-color, 20%);
                }
            }
        }
    }
}

// Mixins
@mixin flex-center {
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    @include flex-center;
}

// Functions
@function calculate-rem($px) {
    @return $px / 16px * 1rem;
}

.element {
    font-size: calculate-rem(24px);
}

// Extend
%button-base {
    padding: 10px 20px;
    border: none;
    cursor: pointer;
}

.button-primary {
    @extend %button-base;
    background: blue;
}

// Partials & Import
@import 'variables';
@import 'mixins';
@import 'components/button';
```

**Q77. SASS vs SCSS:**

```sass
// SASS (indented syntax)
.container
  display: flex
  .item
    flex: 1

// SCSS (CSS-like syntax, more popular)
.container {
  display: flex;
  .item {
    flex: 1;
  }
}
```

**Q78. Modern CSS Features:**

```css
/* :is() - Reduces repetition */
:is(h1, h2, h3) {
    margin-top: 0;
}

/* :where() - Zero specificity */
:where(h1, h2, h3) {
    margin-bottom: 0;
}

/* :has() - Parent selector */
.card:has(img) {
    padding: 0;
}

/* Logical properties */
margin-inline-start: 20px;  /* LTR: left, RTL: right */
margin-inline-end: 20px;
margin-block-start: 10px;  /* top */
margin-block-end: 10px;  /* bottom */

/* aspect-ratio */
.video {
    aspect-ratio: 16 / 9;
}

/* gap (works with Flexbox now) */
.flex {
    display: flex;
    gap: 20px;
}

/* clamp() */
font-size: clamp(1rem, 2.5vw, 2rem);

/* min(), max() */
width: min(100%, 1200px);
padding: max(20px, 5vw);
```

**Q79. CSS Nesting (Native, Modern):**

```css
/* Native CSS nesting (modern browsers) */
.card {
    padding: 20px;
    
    & .title {
        font-size: 24px;
    }
    
    & .content {
        margin-top: 10px;
    }
    
    &:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    &.large {
        padding: 40px;
    }
}
```

**Q80. CSS @layer (Cascade Layers):**

```css
/* Define layer order */
@layer reset, base, components, utilities;

/* Add styles to layers */
@layer reset {
    * {
        margin: 0;
        padding: 0;
    }
}

@layer base {
    body {
        font-family: Arial;
    }
}

@layer components {
    .button {
        padding: 10px 20px;
    }
}

@layer utilities {
    .hidden {
        display: none !important;
    }
}

/* Unlayered styles have highest priority */
.special {
    color: red;  /* Higher than all layers */
}
```

---

## Summary

CSS variables enable dynamic theming, SASS provides powerful preprocessing features, and modern CSS includes native nesting, :is(), :has(), and cascade layers. Use CSS variables for runtime changes and SASS for compile-time organization.
