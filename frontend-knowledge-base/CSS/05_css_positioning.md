# CSS Positioning & Transforms - Interview Questions & Answers

## Q41-50: Positioning, Z-Index, and Transforms

### Q41-45: Positioning Deep Dive

**Q41. Explain all CSS position values:**

```css
/* static: Default, normal flow */
position: static;

/* relative: Offset from normal position */
.relative {
    position: relative;
    top: 10px;
    left: 20px;
    /* Original space preserved */
}

/* absolute: Positioned relative to nearest positioned ancestor */
.absolute {
    position: absolute;
    top: 0;
    right: 0;
    /* Removed from flow */
}

/* fixed: Positioned relative to viewport */
.fixed {
    position: fixed;
    bottom: 20px;
    right: 20px;
    /* Stays during scroll */
}

/* sticky: Hybrid of relative and fixed */
.sticky {
    position: sticky;
    top: 0;
    /* Relative until threshold, then fixed */
}
```

**Q42. How does z-index work?**

```css
/* Only works on positioned elements */
.layer1 { position: relative; z-index: 1; }
.layer2 { position: relative; z-index: 2; }  /* On top */
.layer3 { position: relative; z-index: 999; }  /* Highest */

/* Stacking context */
.parent {
    position: relative;
    z-index: 1;
}
.child {
    position: relative;
    z-index: 9999;  /* Still behind elements with parent z-index: 2 */
}

/* Common z-index scale */
:root {
    --z-dropdown: 1000;
    --z-sticky: 1020;
    --z-fixed: 1030;
    --z-modal-backdrop: 1040;
    --z-modal: 1050;
    --z-tooltip: 1070;
}
```

**Q43. What creates a stacking context?**

```css
/* These create new stacking context: */
position: absolute/relative/fixed/sticky + z-index (not auto);
opacity < 1;
transform (any value);
filter (any value);
perspective (any value);
will-change (certain properties);
isolation: isolate;
```

**Q44. Sticky positioning use cases:**

```css
/* Sticky header */
.header {
    position: sticky;
    top: 0;
    background: white;
    z-index: 100;
}

/* Sticky table headers */
th {
    position: sticky;
    top: 0;
    background: white;
}

/* Sticky sidebar */
.sidebar {
    position: sticky;
    top: 20px;
    align-self: flex-start;
}
```

**Q45. Center element with position absolute:**

```css
/* Method 1: Transform */
.center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

/* Method 2: Margin auto */
.center {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width: 200px;
    height: 100px;
}

/* Method 3: Inset */
.center {
    position: absolute;
    inset: 0;  /* top right bottom left: 0 */
    margin: auto;
    width: fit-content;
    height: fit-content;
}
```

### Q46-50: Transforms

**Q46. CSS Transform properties:**

```css
/* Translate (move) */
transform: translate(50px, 100px);
transform: translateX(50px);
transform: translateY(100px);
transform: translateZ(50px);  /* 3D */
transform: translate3d(50px, 100px, 50px);

/* Scale */
/* transform: scale(factor) | scale(x, y) */
transform: scale(1.5);  /* 150% */
transform: scaleX(2);
transform: scaleY(0.5);
transform: scale(2, 0.5);  /* X, Y */

/* Rotate */
transform: rotate(45deg);
transform: rotateX(45deg);  /* 3D */
transform: rotateY(45deg);  /* 3D */
transform: rotateZ(45deg);  /* Same as rotate */
transform: rotate3d(1, 1, 1, 45deg);

/* Skew */
transform: skew(20deg, 10deg);
transform: skewX(20deg);
transform: skewY(10deg);

/* Multiple transforms */
/* transform: translate(x, y) rotate(deg) scale(factor) */
transform: translate(50px, 100px) rotate(45deg) scale(1.5);

/* Transform origin */
transform-origin: center;  /* Default */
transform-origin: top left;
transform-origin: 50% 50%;
transform-origin: 100px 50px;
```

**Q47. 3D Transforms:**

```css
.container {
    perspective: 1000px;  /* 3D depth */
}

.card {
    transform-style: preserve-3d;  /* Children in 3D space */
    transition: transform 0.6s;
}

.card:hover {
    transform: rotateY(180deg);
}

/* Card flip */
.card-front, .card-back {
    backface-visibility: hidden;  /* Hide when rotated */
}

.card-back {
    transform: rotateY(180deg);
}
```

**Q48. Transform vs Position for animations:**

```css
/* ❌ Bad: Triggers layout */
.box {
    position: relative;
    left: 0;
    transition: left 0.3s;
}
.box:hover {
    left: 100px;
}

/* ✅ Good: GPU accelerated */
.box {
    transform: translateX(0);
    transition: transform 0.3s;
}
.box:hover {
    transform: translateX(100px);
}
```

**Q49. will-change property:**

```css
/* Optimize for upcoming changes */
.element {
    will-change: transform;  /* Hint browser to optimize */
}

.element:hover {
    transform: scale(1.2);
}

/* Don't overuse */
/* ❌ Bad */
* {
    will-change: transform, opacity;
}

/* ✅ Good: Specific elements */
.animated-card {
    will-change: transform;
}
```

**Q50. Matrix transforms:**

```css
/* Matrix for complex transforms */
/* transform: matrix(a, b, c, d, tx, ty) */
transform: matrix(a, b, c, d, tx, ty);

/* Example: Rotate 45deg */
transform: matrix(0.707, 0.707, -0.707, 0.707, 0, 0);

/* 3D Matrix */
transform: matrix3d(...);  /* 16 values */

/* Usually use individual transforms instead */
transform: rotate(45deg) scale(1.5) translate(50px, 100px);
```

---

## Summary

Positioning and transforms are essential for layouts and animations. Use `position: sticky` for sticky headers, transforms for performant animations, and understand stacking contexts for proper z-index behavior.
