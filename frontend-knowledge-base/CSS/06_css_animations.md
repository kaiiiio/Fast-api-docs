# CSS Animations & Transitions - Interview Questions & Answers

## Q51-60: Animations, Transitions, and Motion

### Q51-55: Transitions

**Q51. CSS Transitions:**

```css
.element {
    /* transition: property | duration | timing-function | delay */
    transition: property duration timing-function delay;
    
    /* Examples */
    transition: all 0.3s ease;
    transition: background-color 0.5s ease-in-out 0.1s;
    transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    
    /* Multiple properties */
    transition: background 0.3s, transform 0.5s, opacity 0.2s;
    
    /* Individual properties */
    transition-property: transform;
    transition-duration: 0.3s;
    transition-timing-function: ease-in-out;
    transition-delay: 0.1s;
}

.element:hover {
    transform: scale(1.1);
    background: blue;
}
```

**Q52. Timing Functions:**

```css
/* Predefined */
transition-timing-function: linear;
transition-timing-function: ease;  /* Default */
transition-timing-function: ease-in;
transition-timing-function: ease-out;
transition-timing-function: ease-in-out;

/* Cubic Bezier (custom) */
transition-timing-function: cubic-bezier(0.42, 0, 0.58, 1);

/* Steps */
transition-timing-function: steps(4, end);
transition-timing-function: step-start;
transition-timing-function: step-end;
```

**Q53. Transitionable Properties:**

```css
/* ✅ Can transition */
opacity, transform, color, background-color, width, height,
margin, padding, border, box-shadow, filter, etc.

/* ❌ Cannot transition */
display, position, font-family, etc.

/* Workaround for display */
.element {
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
}
.element.show {
    opacity: 1;
    visibility: visible;
}
```

**Q54. Performance - What to animate:**

```css
/* ✅ GPU Accelerated (60fps) */
transform: translate(), scale(), rotate()
opacity

/* ⚠️ Expensive (avoid) */
width, height, top, left, margin, padding

/* Example */
/* ❌ Bad */
.box:hover {
    width: 300px;  /* Triggers layout */
}

/* ✅ Good */
.box:hover {
    transform: scaleX(1.5);  /* GPU accelerated */
}
```

**Q55. Transition Events:**

```javascript
element.addEventListener('transitionend', (e) => {
    console.log('Transition ended:', e.propertyName);
});

element.addEventListener('transitionstart', (e) => {
    console.log('Transition started');
});

element.addEventListener('transitioncancel', (e) => {
    console.log('Transition cancelled');
});
```

### Q56-60: Animations

**Q56. CSS Animations:**

```css
/* Define keyframes */
@keyframes slideIn {
    from {
        transform: translateX(-100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Or with percentages */
@keyframes bounce {
    0% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0); }
}

/* Apply animation */
.element {
    /* animation: name | duration | timing-function | delay | iteration-count | direction | fill-mode | play-state */
    animation: slideIn 0.5s ease-out;
    
    /* Full syntax */
    animation-name: slideIn;
    animation-duration: 0.5s;
    animation-timing-function: ease-out;
    animation-delay: 0.2s;
    animation-iteration-count: infinite;  /* or number */
    animation-direction: normal;  /* normal | reverse | alternate | alternate-reverse */
    animation-fill-mode: forwards;  /* none | forwards | backwards | both */
    animation-play-state: running;  /* running | paused */
}
```

**Q57. Animation Fill Mode:**

```css
/* none: Default, no styles before/after */
animation-fill-mode: none;

/* forwards: Keeps final keyframe styles */
animation-fill-mode: forwards;

/* backwards: Applies first keyframe before animation */
animation-fill-mode: backwards;

/* both: Applies both forwards and backwards */
animation-fill-mode: both;

/* Example */
@keyframes fadeOut {
    to { opacity: 0; }
}

.element {
    animation: fadeOut 1s forwards;  /* Stays at opacity: 0 */
}
```

**Q58. Multiple Animations:**

```css
.element {
    animation: 
        slideIn 0.5s ease-out,
        fadeIn 0.3s ease-in,
        bounce 1s infinite;
}

@keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}
```

**Q59. Animation Events:**

```javascript
element.addEventListener('animationstart', (e) => {
    console.log('Animation started:', e.animationName);
});

element.addEventListener('animationiteration', (e) => {
    console.log('Animation iteration');
});

element.addEventListener('animationend', (e) => {
    console.log('Animation ended');
});
```

**Q60. Common Animation Patterns:**

```css
/* Fade in */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Slide in from left */
@keyframes slideInLeft {
    from {
        transform: translateX(-100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Bounce */
@keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-30px); }
    60% { transform: translateY(-15px); }
}

/* Pulse */
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* Shake */
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
}

/* Rotate */
@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Loading spinner */
.spinner {
    animation: rotate 1s linear infinite;
}
```

---

## Summary

Transitions are for simple state changes, animations for complex sequences. Always prefer animating `transform` and `opacity` for best performance. Use `animation-fill-mode: forwards` to keep final state.
