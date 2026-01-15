# Scroll and Animations: Complete Guide with Visual Examples

Complete guide to scroll events and CSS animations.

## 1. Scroll Events

### Question
How to handle scroll events in React?

### Solution

```jsx
import { useEffect, useState, useRef } from 'react';

// Basic scroll handler
function ScrollComponent() {
    const [scrollY, setScrollY] = useState(0);
    
    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    return <div>Scroll Y: {scrollY}px</div>;
}

/**
 * 💡 Detailed Notes: Scroll Event Listeners
 * addEventListener: Attach a listener to the 'window' object to monitor the scroll position globally.
 * removeEventListener: It is mandatory to remove the listener in the cleanup function to prevent memory leaks.
 * Performance: Scroll events trigger with high frequency (on every pixel). Avoid placing heavy logic inside handleScroll (Consider Throttling).
 */

### Oral Explanation (Interview Ready)

> "When using global event listeners like `scroll` or `resize`, there are two critical considerations for a senior developer:"

1.  **Memory Management**: If you fail to call `removeEventListener`, the function remains in memory even after the component unmounts. This leads to cumulative performance degradation and memory leaks.
2.  **Performance & Junk**: Because the scroll event fires extremely frequently, it can interfere with the browser's 60 FPS rendering cycle. I always recommend using **Throttling** or **Debouncing** to ensure the scroll handler doesn't block the main thread.

// Scroll to element
function ScrollToElement() {
    const targetRef = useRef(null);
    
    const scrollToTarget = () => {
        targetRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };
    
    return (
        <div>
            <button onClick={scrollToTarget}>Scroll to target</button>
            <div style={{ height: '200vh' }}>Spacer</div>
            <div ref={targetRef}>Target element</div>
        </div>
    );
}

/**
 * 💡 Detailed Notes: scrollIntoView
 * Purpose: A native DOM method used to pull specific elements into the user's viewport.
 * Options: behavior ('smooth' provides a better UX), block ('start', 'center', 'end', 'nearest'), and inline.
 * Oral Point: "I prefer `behavior: smooth` over manual anchor tags for precise programmatic control."
 */

// Infinite scroll
function InfiniteScroll({ onLoadMore }) {
    const observerRef = useRef(null);
    const lastElementRef = useCallback(node => {
        if (observerRef.current) observerRef.current.disconnect();
        
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                onLoadMore();
            }
        });
        
        if (node) observerRef.current.observe(node);
    }, [onLoadMore]);
    
    return <div ref={lastElementRef}>Loading...</div>;
}

/**
 * 🧠 Detailed Notes: IntersectionObserver
 * Purpose: Provides asynchronous detection of an element's visibility/intersection with a parent or the viewport.
 * Key properties: isIntersecting (boolean), intersectionRatio (percentage visible), and target (the element).
 * Performance: It is a massive performance winner over scroll listeners because it is event-based and doesn't require constant polling or throttling.
 */

// Scroll position indicator
function ScrollIndicator() {
    const [scrollPercent, setScrollPercent] = useState(0);
    
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const percent = (scrollTop / (documentHeight - windowHeight)) * 100;
            setScrollPercent(percent);
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    return (
        <div className="scroll-indicator">
            <div
                className="scroll-bar"
                style={{ width: `${scrollPercent}%` }}
            />
        </div>
    );
}
```

### Scroll Event Flow

```
User scrolls
       │
       ▼
┌──────────────┐
│ scroll event │
└──────┬───────┘
       │
       ├─ window.scrollY (vertical)
       ├─ window.scrollX (horizontal)
       ├─ element.scrollTop
       └─ element.scrollLeft
       │
       ▼
   Handler runs
```

---

## 🛠️ Deep Dive: Browser APIs for Scrolling

### 📍 `scrollIntoView` (The Easy Way)

**What is it?**: A built-in DOM method used to scroll an element into the visible area of the browser window.

**Properties Breakdown**:
*   **`behavior`**: 
    *   `smooth`: Nice animation (interpolated scroll).
    *   `auto`: Instant jump.
*   **`block` (Vertical)**:
    *   `nearest`: If the element is already partially visible, it won't move; otherwise, it scrolls the shortest distance to bring it into view.
*   **`inline` (Horizontal)**: Same keys as `block`, horizontal scroll ke liye.

---

### 👁️ `IntersectionObserver` (The Smart Way)

**What is it?**: An API that allows you to "watch" when an element enters or leaves the viewport (or a specific parent element).

**The Callback Parameters (`entries`)**:
Jab callback trigger hota h, humein `entries` milti hain (Array of objects):
1.  **`isIntersecting`**: (Boolean) The most critical property. Returns `true` if even 1 pixel of the target is visible.
2.  **`intersectionRatio`**: (0.0 to 1.0) Exact kitna percentage dikh raha h (e.g., 0.5 means half-visible).
3.  **`boundingClientRect`**: Element ki geometry (top, left, width, height).
4.  **`target`**: Wo real HTML element jise observe kiya ja raha h (helpful when observing multiple items).

**The Options Config**:
1.  **`root`**: The element that is used as the viewport for checking visibility. Defaults to the browser window if `null`.
2.  **`rootMargin`**: Acts like "fake padding" for detection. For example, `rootMargin: '100px'` will trigger `isIntersecting: true` 100px before the element actually enters the screen (perfect for pre-fetching data in infinite scrolls).
3.  **`threshold`**: Defines the percentage of the element's visibility required to trigger the callback. `0.1` means 10%, while `[0, 0.5, 1]` triggers at the start, middle, and full visibility.

### Oral Explanation (Interview Ready)

> "The true powerhouse of the **`IntersectionObserver`** is the `rootMargin`. It allows us to load content just before the user actually sees it, creating a seamless 'infinite' feel. Since it is entirely event-driven, it places zero overhead on the main thread compared to traditional scroll listeners."

---

## 2. CSS Transform: translate

### Question
How does CSS translate work?

### Solution

```css
/* Translate */
.translate {
    transform: translateX(50px);  /* Move right */
    transform: translateY(50px); /* Move down */
    transform: translate(50px, 50px); /* X, Y */
    transform: translateZ(50px); /* 3D - forward */
    transform: translate3d(50px, 50px, 50px); /* X, Y, Z */
}

/* Combined */
.combined {
    transform: translate(50px, 50px) rotate(45deg) scale(1.2);
}
```

### Visual Representation

```
ORIGINAL POSITION:
┌─────────────────────────────────────┐
│                                     │
│         ┌──────┐                    │
│         │ Box │                    │
│         └──────┘                    │
│                                     │
└─────────────────────────────────────┘

TRANSLATE X (50px):
┌─────────────────────────────────────┐
│                                     │
│              ┌──────┐              │
│              │ Box │              │
│              └──────┘              │
│         ← moved right              │
└─────────────────────────────────────┘

TRANSLATE Y (50px):
┌─────────────────────────────────────┐
│                                     │
│         ┌──────┐                    │
│         │ Box │                    │
│         └──────┘                    │
│         ↓ moved down                │
│                                     │
└─────────────────────────────────────┘

TRANSLATE (50px, 50px):
┌─────────────────────────────────────┐
│                                     │
│              ┌──────┐              │
│              │ Box │              │
│              └──────┘              │
│         ↘ moved right & down       │
│                                     │
└─────────────────────────────────────┘
```

---

## 3. CSS Animations

### Question
How to create CSS animations?

### Solution

```css
/* Keyframes */
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

@keyframes bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-20px);
    }
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* Apply animation */
.animated {
    animation: slideIn 0.5s ease-in-out;
    animation: bounce 1s infinite;
    animation: rotate 2s linear infinite;
}

/* Animation properties */
.control {
    animation-name: slideIn;
    animation-duration: 1s;
    animation-timing-function: ease-in-out;
    animation-delay: 0.5s;
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-fill-mode: forwards;
    animation-play-state: running;
}

/* Shorthand */
.shorthand {
    animation: slideIn 1s ease-in-out 0.5s infinite alternate;
}
```

### Animation Visual

```
SLIDE IN:
┌─────────────────────────────────────┐
│ [Box] → → → → → → → → → → → →     │
│  Start (off-screen)    End (visible)│
└─────────────────────────────────────┘

BOUNCE:
┌─────────────────────────────────────┐
│         ↑                           │
│      [Box]                          │
│         │                           │
│      [Box] ← bounce                 │
│         │                           │
│      [Box]                          │
│         ↓                           │
└─────────────────────────────────────┘

ROTATE:
┌─────────────────────────────────────┐
│      ┌────┐                         │
│      │Box│ → rotate 360°           │
│      └────┘                         │
└─────────────────────────────────────┘
```

---

## 4. CSS Transitions

### Question
How to use CSS transitions?

### Solution

```css
/* Basic transition */
.transition {
    transition: all 0.3s ease;
}

/* Specific property */
.specific {
    transition: transform 0.3s ease, opacity 0.5s linear;
}

/* Transition properties */
.detailed {
    transition-property: transform, background-color;
    transition-duration: 0.3s, 0.5s;
    transition-timing-function: ease-in-out, linear;
    transition-delay: 0s, 0.1s;
}

/* Shorthand */
.shorthand {
    transition: transform 0.3s ease-in-out 0.1s;
}

/* Hover example */
.button {
    background-color: blue;
    transition: background-color 0.3s ease;
}

.button:hover {
    background-color: red;
}
```

### Transition Visual

```
BEFORE (initial state):
┌─────────────────────────────────────┐
│ [Button] (blue)                    │
└─────────────────────────────────────┘

DURING (transition):
┌─────────────────────────────────────┐
│ [Button] (purple) ← transitioning  │
└─────────────────────────────────────┘

AFTER (final state):
┌─────────────────────────────────────┐
│ [Button] (red)                      │
└─────────────────────────────────────┘
```

---

## 5. React Animation Hook

### Question
How to create animated components in React?

### Solution

```jsx
import { useState, useEffect } from 'react';

function useAnimation(initialState = false) {
    const [isAnimating, setIsAnimating] = useState(initialState);
    const [animationClass, setAnimationClass] = useState('');
    
    const startAnimation = (animationName) => {
        setAnimationClass(animationName);
        setIsAnimating(true);
    };
    
    const stopAnimation = () => {
        setIsAnimating(false);
        setAnimationClass('');
    };
    
    return {
        isAnimating,
        animationClass,
        startAnimation,
        stopAnimation
    };
}

// Usage
function AnimatedBox() {
    const { animationClass, startAnimation } = useAnimation();
    
    return (
        <div
            className={`box ${animationClass}`}
            onClick={() => startAnimation('bounce')}
        >
            Click to animate
        </div>
    );
}

// Fade in on mount
function FadeIn({ children }) {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        setIsVisible(true);
    }, []);
    
    return (
        <div
            className={`fade-in ${isVisible ? 'visible' : ''}`}
        >
            {children}
        </div>
    );
}
```

---

## 6. Scroll-triggered Animations

### Question
How to animate elements on scroll?

### Solution

```jsx
function ScrollAnimation() {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef(null);
    
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                    }
                });
            },
            { threshold: 0.1 }
        );
        
        if (elementRef.current) {
            observer.observe(elementRef.current);
        }
        
        return () => {
            if (elementRef.current) {
                observer.unobserve(elementRef.current);
            }
        };
    }, []);
    
    return (
        <div
            ref={elementRef}
            className={`scroll-animate ${isVisible ? 'animate' : ''}`}
        >
            This animates when scrolled into view
        </div>
    );
}
```

### Scroll Animation Flow

```
Element off-screen
       │
       ▼
User scrolls
       │
       ▼
Element enters viewport
       │
       ▼
IntersectionObserver triggers
       │
       ▼
Animation starts
       │
       ▼
Element fully visible
```

---

## 7. Transform Properties

### Question
Complete guide to CSS transform properties.

### Solution

```css
/* Translate */
.translate {
    transform: translateX(50px);
    transform: translateY(50px);
    transform: translate(50px, 50px);
    transform: translateZ(50px);
    transform: translate3d(50px, 50px, 50px);
}

/* Rotate */
.rotate {
    transform: rotate(45deg);
    transform: rotateX(45deg);
    transform: rotateY(45deg);
    transform: rotateZ(45deg);
    transform: rotate3d(1, 1, 1, 45deg);
}

/* Scale */
.scale {
    transform: scale(1.5);
    transform: scaleX(1.5);
    transform: scaleY(1.5);
    transform: scale(1.5, 2);
    transform: scale3d(1.5, 1.5, 1.5);
}

/* Skew */
.skew {
    transform: skewX(15deg);
    transform: skewY(15deg);
    transform: skew(15deg, 10deg);
}

/* Combined */
.combined {
    transform: translate(50px, 50px) rotate(45deg) scale(1.2);
}

/* Transform origin */
.origin {
    transform-origin: center;
    transform-origin: top left;
    transform-origin: 50% 50%;
    transform-origin: 0 0;
}
```

### Transform Visual Examples

```
ROTATE:
┌────┐     ┌───┐
│Box │ →  │Box│ (rotated 45°)
└────┘     └───┘

SCALE:
┌────┐     ┌──────┐
│Box │ →  │ Box  │ (scaled 1.5x)
└────┘     └──────┘

SKEW:
┌────┐     ┌─────┐
│Box │ →  │Box  │ (skewed)
└────┘     └─────┘
```

---

## Key Concepts

1. **Scroll Events**: scroll, scrollIntoView, IntersectionObserver
2. **Transform**: translate, rotate, scale, skew
3. **Animations**: @keyframes, animation properties
4. **Transitions**: transition properties, timing functions
5. **Scroll Animations**: IntersectionObserver for scroll-triggered
6. **Transform Origin**: Control transform center point

## Best Practices

- ✅ Use transform for performance (GPU accelerated)
- ✅ Use IntersectionObserver for scroll animations
- ✅ Prefer CSS animations over JS when possible
- ✅ Use will-change for optimization
- ✅ Debounce scroll handlers
- ✅ Use requestAnimationFrame for smooth animations

