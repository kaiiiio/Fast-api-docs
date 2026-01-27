# Tailwind CSS vs CSS - Complete Comparison Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Setup & Configuration](#setup)
3. [Basic Styling](#basic-styling)
4. [Layout & Positioning](#layout-positioning)
5. [Transforms & Translate](#transforms)
6. [Animations](#animations)
7. [Transitions](#transitions)
8. [Keyframes](#keyframes)
9. [Pointer Events & Cursors](#pointer-events)
10. [Responsive Design](#responsive)
11. [Hover, Focus & States](#states)
12. [Advanced Techniques](#advanced)

---

## Introduction

### What is Tailwind CSS?

Tailwind is a **utility-first CSS framework** that provides low-level utility classes to build custom designs without writing CSS.

**CSS (Traditional):**
```css
.button {
    background-color: blue;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
}
```

**Tailwind:**
```html
<button class="bg-blue-500 text-white px-6 py-3 rounded-lg">
    Button
</button>
```

---

## Setup & Configuration

### Installation

```bash
# Install Tailwind
npm install -D tailwindcss
npx tailwindcss init

# With PostCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### tailwind.config.js

```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3490dc',
        secondary: '#ffed4e',
      },
      spacing: {
        '128': '32rem',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
```

### CSS File

```css
/* styles.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CSS */
@layer components {
  .btn-primary {
    @apply bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600;
  }
}
```

---

## Basic Styling

### Colors

**CSS:**
```css
.element {
    color: #3b82f6;
    background-color: #ef4444;
    border-color: #10b981;
}
```

**Tailwind:**
```html
<div class="text-blue-500 bg-red-500 border-green-500">
    Content
</div>

<!-- Color shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 -->
<div class="bg-blue-50">Lightest</div>
<div class="bg-blue-500">Medium</div>
<div class="bg-blue-900">Darkest</div>
```

### Typography

**CSS:**
```css
.text {
    font-size: 24px;
    font-weight: bold;
    line-height: 1.5;
    text-align: center;
    text-decoration: underline;
    text-transform: uppercase;
    letter-spacing: 2px;
}
```

**Tailwind:**
```html
<p class="text-2xl font-bold leading-relaxed text-center underline uppercase tracking-wide">
    Text
</p>

<!-- Font sizes -->
<p class="text-xs">Extra small</p>
<p class="text-sm">Small</p>
<p class="text-base">Base (16px)</p>
<p class="text-lg">Large</p>
<p class="text-xl">Extra large</p>
<p class="text-2xl">2X large</p>
<p class="text-4xl">4X large</p>

<!-- Font weights -->
<p class="font-thin">100</p>
<p class="font-normal">400</p>
<p class="font-bold">700</p>
<p class="font-black">900</p>
```

### Spacing (Padding & Margin)

**CSS:**
```css
.element {
    margin: 16px;
    margin-top: 8px;
    margin-bottom: 24px;
    padding: 20px;
    padding-left: 40px;
}
```

**Tailwind:**
```html
<div class="m-4 mt-2 mb-6 p-5 pl-10">
    Content
</div>

<!-- Spacing scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64 -->
<!-- 1 unit = 0.25rem = 4px -->

<!-- All sides -->
<div class="m-4">margin: 1rem</div>
<div class="p-4">padding: 1rem</div>

<!-- Individual sides -->
<div class="mt-4">margin-top</div>
<div class="mr-4">margin-right</div>
<div class="mb-4">margin-bottom</div>
<div class="ml-4">margin-left</div>

<!-- Horizontal & Vertical -->
<div class="mx-4">margin-left + margin-right</div>
<div class="my-4">margin-top + margin-bottom</div>
<div class="px-4">padding-left + padding-right</div>
<div class="py-4">padding-top + padding-bottom</div>

<!-- Auto & Negative -->
<div class="mx-auto">margin: 0 auto (center)</div>
<div class="-mt-4">margin-top: -1rem</div>
```

---

## Layout & Positioning

### Display

**CSS:**
```css
.element {
    display: block;
    display: inline-block;
    display: flex;
    display: grid;
    display: none;
}
```

**Tailwind:**
```html
<div class="block">Block</div>
<div class="inline-block">Inline Block</div>
<div class="flex">Flex</div>
<div class="grid">Grid</div>
<div class="hidden">Hidden</div>
<div class="inline">Inline</div>
```

### Flexbox

**CSS:**
```css
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 16px;
}

.item {
    flex: 1;
    flex-grow: 1;
    flex-shrink: 0;
}
```

**Tailwind:**
```html
<div class="flex justify-center items-center flex-col gap-4">
    <div class="flex-1">Item 1</div>
    <div class="flex-grow">Item 2</div>
    <div class="flex-shrink-0">Item 3</div>
</div>

<!-- Justify Content -->
<div class="flex justify-start">Start</div>
<div class="flex justify-center">Center</div>
<div class="flex justify-end">End</div>
<div class="flex justify-between">Space Between</div>
<div class="flex justify-around">Space Around</div>
<div class="flex justify-evenly">Space Evenly</div>

<!-- Align Items -->
<div class="flex items-start">Start</div>
<div class="flex items-center">Center</div>
<div class="flex items-end">End</div>
<div class="flex items-stretch">Stretch</div>

<!-- Direction -->
<div class="flex flex-row">Row</div>
<div class="flex flex-col">Column</div>
<div class="flex flex-row-reverse">Row Reverse</div>
```

### Grid

**CSS:**
```css
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto;
    gap: 20px;
}
```

**Tailwind:**
```html
<div class="grid grid-cols-3 gap-5">
    <div>1</div>
    <div>2</div>
    <div>3</div>
</div>

<!-- Grid Columns -->
<div class="grid grid-cols-1">1 column</div>
<div class="grid grid-cols-2">2 columns</div>
<div class="grid grid-cols-3">3 columns</div>
<div class="grid grid-cols-4">4 columns</div>
<div class="grid grid-cols-12">12 columns</div>

<!-- Column Span -->
<div class="col-span-2">Span 2 columns</div>
<div class="col-span-full">Span all columns</div>

<!-- Gap -->
<div class="grid gap-4">Gap 1rem</div>
<div class="grid gap-x-4 gap-y-8">Different gaps</div>
```

### Position

**CSS:**
```css
.element {
    position: relative;
    position: absolute;
    position: fixed;
    position: sticky;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
}
```

**Tailwind:**
```html
<div class="relative">Relative</div>
<div class="absolute top-0 right-0">Absolute</div>
<div class="fixed bottom-0 left-0">Fixed</div>
<div class="sticky top-0">Sticky</div>

<!-- Positioning -->
<div class="absolute top-0">Top 0</div>
<div class="absolute right-4">Right 1rem</div>
<div class="absolute bottom-0">Bottom 0</div>
<div class="absolute left-0">Left 0</div>

<!-- Inset (all sides) -->
<div class="absolute inset-0">All sides 0</div>
<div class="absolute inset-x-0">Left & Right 0</div>
<div class="absolute inset-y-0">Top & Bottom 0</div>

**What is `inset`?**

`inset` is a CSS shorthand that sets all four positioning properties (`top`, `right`, `bottom`, `left`) at once.

**CSS Equivalent:**
```css
/* Instead of: */
.element {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

/* Use inset: */
.element {
    position: absolute;
    inset: 0;  /* All four sides = 0 */
}
```

**Tailwind Inset Classes:**
```html
<!-- inset-0: Fills entire parent -->
<div class="absolute inset-0">
    <!-- top: 0; right: 0; bottom: 0; left: 0; -->
</div>

<!-- inset-x-0: Stretches horizontally -->
<div class="absolute inset-x-0">
    <!-- left: 0; right: 0; (top/bottom unset) -->
</div>

<!-- inset-y-0: Stretches vertically -->
<div class="absolute inset-y-0">
    <!-- top: 0; bottom: 0; (left/right unset) -->
</div>

<!-- Other values -->
<div class="absolute inset-4">All sides 1rem</div>
<div class="absolute -inset-2">Negative inset</div>
```

**Practical Examples:**
```html
<!-- Full overlay -->
<div class="relative">
    <img src="image.jpg">
    <div class="absolute inset-0 bg-black bg-opacity-50">
        Overlay covers entire image
    </div>
</div>

<!-- Modal backdrop -->
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-white p-8 rounded">Modal</div>
</div>

<!-- Top banner (full width) -->
<div class="absolute inset-x-0 top-0 h-16 bg-blue-500">
    Full width banner
</div>

<!-- Sidebar (full height) -->
<div class="absolute inset-y-0 left-0 w-64 bg-gray-800">
    Full height sidebar
</div>
```

┌─────────────────────────────┐
│  Parent (position: relative) │
│  ┌─────────────────────────┐ │
│  │ inset-0                 │ │  ← Fills entire parent
│  │ (all sides = 0)         │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Parent                      │
│  ┌─────────────────────────┐ │
│  │ inset-x-0               │ │  ← Stretches horizontally
│  │ (left & right = 0)      │ │     (top/bottom not set)
│  └─────────────────────────┘ │
└─────────────────────────────┘

┌─────────────────────────────┐
│  ┌───┐                       │
│  │ i │ inset-y-0             │  ← Stretches vertically
│  │ n │ (top & bottom = 0)    │     (left/right not set)
│  │ s │                       │
│  │ e │                       │
│  │ t │                       │
│  └───┘                       │
└─────────────────────────────┘

<!-- Z-index -->
<div class="z-0">z-index: 0</div>
<div class="z-10">z-index: 10</div>
<div class="z-50">z-index: 50</div>
```

---

## Transforms & Translate

### Translate (Move)

**CSS:**
```css
.element {
    transform: translateX(10px);
    transform: translateY(20px);
    transform: translate(10px, 20px);
    transform: translate(-50%, -50%); /* Center */
}
```

**Tailwind:**
```html
<!-- Translate X -->
<div class="translate-x-4">translateX(1rem)</div>
<div class="translate-x-1/2">translateX(50%)</div>
<div class="-translate-x-4">translateX(-1rem)</div>

<!-- Translate Y -->
<div class="translate-y-4">translateY(1rem)</div>
<div class="translate-y-1/2">translateY(50%)</div>
<div class="-translate-y-4">translateY(-1rem)</div>

<!-- Center element -->
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
    Centered
</div>

<!-- Hover translate -->
<div class="hover:translate-x-2 transition">
    Slide on hover
</div>
```

### Scale

**CSS:**
```css
.element {
    transform: scale(1.5);
    transform: scaleX(1.2);
    transform: scaleY(0.8);
}

.element:hover {
    transform: scale(1.1);
}
```

**Tailwind:**
```html
<div class="scale-150">scale(1.5)</div>
<div class="scale-x-120">scaleX(1.2)</div>
<div class="scale-y-80">scaleY(0.8)</div>

<!-- Common scales -->
<div class="scale-0">scale(0)</div>
<div class="scale-50">scale(0.5)</div>
<div class="scale-75">scale(0.75)</div>
<div class="scale-100">scale(1)</div>
<div class="scale-125">scale(1.25)</div>
<div class="scale-150">scale(1.5)</div>

<!-- Hover scale -->
<div class="hover:scale-110 transition">
    Grow on hover
</div>

<button class="hover:scale-105 active:scale-95 transition">
    Button with scale
</button>
```

### Rotate

**CSS:**
```css
.element {
    transform: rotate(45deg);
    transform: rotate(-90deg);
}

.element:hover {
    transform: rotate(180deg);
}
```

**Tailwind:**
```html
<div class="rotate-45">rotate(45deg)</div>
<div class="rotate-90">rotate(90deg)</div>
<div class="rotate-180">rotate(180deg)</div>
<div class="-rotate-45">rotate(-45deg)</div>

<!-- Hover rotate -->
<div class="hover:rotate-180 transition duration-500">
    Rotate on hover
</div>

<!-- Spinning loader -->
<div class="animate-spin">
    ⟳
</div>
```

### Skew

**CSS:**
```css
.element {
    transform: skewX(12deg);
    transform: skewY(6deg);
    transform: skew(12deg, 6deg);
}
```

**Tailwind:**
```html
<div class="skew-x-12">skewX(12deg)</div>
<div class="skew-y-6">skewY(6deg)</div>
<div class="-skew-x-12">skewX(-12deg)</div>

<!-- Hover skew -->
<div class="hover:skew-x-3 transition">
    Skew on hover
</div>
```

### Multiple Transforms

**CSS:**
```css
.element {
    transform: translateX(10px) rotate(45deg) scale(1.2);
}
```

**Tailwind:**
```html
<div class="translate-x-10 rotate-45 scale-120">
    Multiple transforms
</div>

<!-- Transform origin -->
<div class="origin-center">transform-origin: center</div>
<div class="origin-top-left">transform-origin: top left</div>
<div class="origin-bottom-right">transform-origin: bottom right</div>
```

---

## Animations

### Built-in Animations

**CSS:**
```css
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.spinner {
    animation: spin 1s linear infinite;
}
```

**Tailwind:**
```html
<!-- Spin -->
<div class="animate-spin">
    ⟳ Spinning
</div>

<!-- Ping (ripple effect) -->
<div class="animate-ping">
    📍
</div>

<!-- Pulse (fade in/out) -->
<div class="animate-pulse">
    Loading...
</div>

<!-- Bounce -->
<div class="animate-bounce">
    ⬇️ Bounce
</div>
```

### Animation Examples

**CSS:**
```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.fade-in {
    animation: fadeIn 0.5s ease-in;
}
```

**Tailwind (with custom config):**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
}
```

```html
<div class="animate-fade-in">Fade in</div>
<div class="animate-slide-in">Slide in</div>
<div class="animate-bounce-slow">Slow bounce</div>
```

### Practical Animation Examples

```html
<!-- Loading spinner -->
<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600">
</div>

<!-- Pulsing notification badge -->
<div class="relative">
    <button class="bg-blue-500 text-white px-4 py-2 rounded">
        Notifications
    </button>
    <span class="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
    </span>
</div>

<!-- Skeleton loader -->
<div class="animate-pulse space-y-4">
    <div class="h-4 bg-gray-300 rounded w-3/4"></div>
    <div class="h-4 bg-gray-300 rounded"></div>
    <div class="h-4 bg-gray-300 rounded w-5/6"></div>
</div>

<!-- Bouncing arrow -->
<div class="animate-bounce text-4xl">
    ⬇️
</div>
```

---

## Transitions

### Basic Transitions

**CSS:**
```css
.element {
    transition: all 0.3s ease;
    transition: background-color 0.5s ease-in-out;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Tailwind:**
```html
<!-- Transition property -->
<div class="transition">all properties</div>
<div class="transition-colors">colors only</div>
<div class="transition-opacity">opacity only</div>
<div class="transition-transform">transform only</div>
<div class="transition-all">all properties</div>
<div class="transition-none">no transition</div>

<!-- Duration -->
<div class="transition duration-75">75ms</div>
<div class="transition duration-100">100ms</div>
<div class="transition duration-150">150ms</div>
<div class="transition duration-200">200ms</div>
<div class="transition duration-300">300ms (default)</div>
<div class="transition duration-500">500ms</div>
<div class="transition duration-700">700ms</div>
<div class="transition duration-1000">1000ms</div>

<!-- Timing function -->
<div class="transition ease-linear">linear</div>
<div class="transition ease-in">ease-in</div>
<div class="transition ease-out">ease-out</div>
<div class="transition ease-in-out">ease-in-out</div>

<!-- Delay -->
<div class="transition delay-75">75ms delay</div>
<div class="transition delay-150">150ms delay</div>
<div class="transition delay-300">300ms delay</div>
```

### Transition Examples

```html
<!-- Button hover -->
<button class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded transition duration-200">
    Hover me
</button>

<!-- Card hover effect -->
<div class="bg-white p-6 rounded-lg shadow hover:shadow-xl transition-shadow duration-300">
    Card content
</div>

<!-- Smooth color change -->
<div class="bg-red-500 hover:bg-green-500 transition-colors duration-500 p-4">
    Color transition
</div>

<!-- Scale on hover -->
<img src="image.jpg" class="hover:scale-110 transition-transform duration-300">

<!-- Multiple transitions -->
<button class="bg-blue-500 hover:bg-blue-600 hover:scale-105 text-white px-6 py-3 rounded transition-all duration-200">
    Multi transition
</button>

<!-- Smooth opacity -->
<div class="opacity-0 hover:opacity-100 transition-opacity duration-500">
    Fade in on hover
</div>
```

---

## Keyframes

### Custom Keyframes

**CSS:**
```css
@keyframes slideInFromLeft {
    0% {
        transform: translateX(-100%);
        opacity: 0;
    }
    100% {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.slide-in {
    animation: slideInFromLeft 0.5s ease-out;
}
```

**Tailwind (tailwind.config.js):**

```javascript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        /* transform functions & parameters: 
           - translate(x, y): moves element (px, %, rem)
           - rotate(deg): rotates element (deg, turn, rad)
           - scale(x, y): resizes element (multiplier, e.g., 1.5)
           - skew(x, y): distorts element (deg)
        */
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      animation: {
        'slide-in-left': 'slideInLeft 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-in',
        'fade-out': 'fadeOut 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
      },

    },
  },
}
```

**Usage:**
```html
<div class="animate-slide-in-left">Slide from left</div>
<div class="animate-slide-in-right">Slide from right</div>
<div class="animate-fade-in">Fade in</div>
<div class="animate-scale-in">Scale in</div>
<div class="animate-wiggle">Wiggle</div>
<div class="animate-shake">Shake</div>
<div class="animate-float">Float</div>
```

### Complex Keyframe Examples

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        // Gradient animation
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        // Text reveal
        reveal: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        // Typing effect
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '50%': { 'border-color': 'transparent' },
        },
      },
      animation: {
        'gradient': 'gradient 3s ease infinite',    /* name | duration | timing | iteration */
        'reveal': 'reveal 0.6s ease-out',           /* name | duration | timing */
        'typing': 'typing 3.5s steps(40, end), blink 0.75s step-end infinite', /* multi-animation */
      },
    },
  },
}
```

---

## Pointer Events & Cursors

### Pointer Events

**CSS:**
```css
.element {
    pointer-events: none;
    pointer-events: auto;
}
```

**Tailwind:**
```html
<div class="pointer-events-none">Cannot interact</div>
<div class="pointer-events-auto">Can interact</div>

<!-- Practical example -->
<div class="relative">
    <img src="image.jpg" alt="Image">
    <div class="absolute inset-0 bg-black bg-opacity-50 pointer-events-none">
        Overlay (clicks pass through)
    </div>
</div>
```

### Cursor Types

**CSS:**
```css
.element {
    cursor: pointer;
    cursor: not-allowed;
    cursor: wait;
    cursor: text;
    cursor: move;
    cursor: grab;
    cursor: grabbing;
}
```

**Tailwind:**
```html
<!-- Common cursors -->
<div class="cursor-auto">Auto</div>
<div class="cursor-default">Default</div>
<div class="cursor-pointer">Pointer (hand)</div>
<div class="cursor-wait">Wait (loading)</div>
<div class="cursor-text">Text (I-beam)</div>
<div class="cursor-move">Move (4 arrows)</div>
<div class="cursor-not-allowed">Not allowed</div>
<div class="cursor-none">None (hidden)</div>
<div class="cursor-grab">Grab (open hand)</div>
<div class="cursor-grabbing">Grabbing (closed hand)</div>

<!-- Resize cursors -->
<div class="cursor-n-resize">North resize</div>
<div class="cursor-e-resize">East resize</div>
<div class="cursor-s-resize">South resize</div>
<div class="cursor-w-resize">West resize</div>
<div class="cursor-ne-resize">Northeast resize</div>
<div class="cursor-nw-resize">Northwest resize</div>
<div class="cursor-se-resize">Southeast resize</div>
<div class="cursor-sw-resize">Southwest resize</div>

<!-- Zoom cursors -->
<div class="cursor-zoom-in">Zoom in</div>
<div class="cursor-zoom-out">Zoom out</div>

<!-- Practical examples -->
<button class="cursor-pointer hover:bg-blue-600 bg-blue-500 text-white px-4 py-2 rounded">
    Clickable button
</button>

<button disabled class="cursor-not-allowed opacity-50 bg-gray-400 text-white px-4 py-2 rounded">
    Disabled button
</button>

<div class="cursor-grab active:cursor-grabbing p-4 bg-gray-200 rounded">
    Draggable element
</div>
```

### User Select

**CSS:**
```css
.element {
    user-select: none;
    user-select: text;
    user-select: all;
    user-select: auto;
}
```

**Tailwind:**
```html
<div class="select-none">Cannot select text</div>
<div class="select-text">Can select text</div>
<div class="select-all">Select all on click</div>
<div class="select-auto">Auto select</div>

<!-- Practical example -->
<div class="select-none cursor-default p-4 bg-gray-100">
    This text cannot be selected (good for UI elements)
</div>
```

---

## Responsive Design

### Breakpoints

**CSS:**
```css
@media (min-width: 640px) {
    .element { font-size: 18px; }
}

@media (min-width: 768px) {
    .element { font-size: 20px; }
}

@media (min-width: 1024px) {
    .element { font-size: 24px; }
}
```

**Tailwind:**
```html
<!-- Mobile first approach -->
<div class="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
    Responsive text
</div>

<!-- Breakpoints:
    sm: 640px
    md: 768px
    lg: 1024px
    xl: 1280px
    2xl: 1536px
-->

<!-- Responsive layout -->
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
    <div>Item 4</div>
</div>

<!-- Responsive padding -->
<div class="p-4 md:p-8 lg:p-12">
    Content
</div>

<!-- Hide/show on different screens -->
<div class="hidden md:block">
    Visible on medium screens and up
</div>

<div class="block md:hidden">
    Visible only on mobile
</div>
```

---

## Hover, Focus & States

### Hover States

**CSS:**
```css
.button:hover {
    background-color: blue;
    transform: scale(1.05);
}
```

**Tailwind:**
```html
<button class="bg-gray-500 hover:bg-blue-500 hover:scale-105 transition">
    Hover me
</button>

<!-- Multiple hover effects -->
<div class="bg-white hover:bg-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 rounded">
    Card with hover
</div>
```

### Focus States

**CSS:**
```css
.input:focus {
    outline: 2px solid blue;
    border-color: blue;
}
```

**Tailwind:**
```html
<input 
    type="text" 
    /* outline: width | style | color (drawn outside border, no space) */
    class="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none px-4 py-2 rounded"
    placeholder="Focus me"
>

<!-- Focus visible (keyboard only) -->
<button class="focus-visible:ring-2 focus-visible:ring-blue-500 px-4 py-2 bg-blue-500 text-white rounded">
    Keyboard focus
</button>
```

### Active States

**CSS:**
```css
.button:active {
    transform: scale(0.95);
}
```

**Tailwind:**
```html
<button class="bg-blue-500 active:scale-95 active:bg-blue-700 transition px-6 py-3 text-white rounded">
    Click me
</button>
```

### Group Hover

**CSS:**
```css
.card:hover .card-title {
    color: blue;
}

.card:hover .card-image {
    transform: scale(1.1);
}
```

**Tailwind:**
```html
<div class="group">
    <img src="image.jpg" class="group-hover:scale-110 transition">
    <h3 class="group-hover:text-blue-500 transition">
        Title changes on card hover
    </h3>
</div>

<!-- Practical example -->
<div class="group bg-white p-6 rounded-lg hover:shadow-xl transition">
    <img src="product.jpg" class="group-hover:scale-105 transition">
    <h3 class="text-xl group-hover:text-blue-600 transition">Product Name</h3>
    <p class="text-gray-600 group-hover:text-gray-900 transition">Description</p>
</div>
```

### All States Combined

```html
<button class="
    bg-blue-500 
    hover:bg-blue-600 
    active:bg-blue-700 
    focus:ring-2 
    focus:ring-blue-300 
    focus:outline-none
    disabled:opacity-50 
    disabled:cursor-not-allowed
    transition
    px-6 py-3 
    text-white 
    rounded-lg
">
    Full state button
</button>
```

---

## Advanced Techniques

### Dark Mode

**CSS:**
```css
@media (prefers-color-scheme: dark) {
    .element {
        background-color: #1a1a1a;
        color: white;
    }
}
```

**Tailwind:**

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
}
```

```html
<!-- Using class strategy -->
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">
    Content
</div>

<!-- Toggle dark mode -->
<html class="dark">
    <body class="bg-white dark:bg-gray-900">
        <h1 class="text-black dark:text-white">Title</h1>
    </body>
</html>

<script>
// Toggle dark mode
document.documentElement.classList.toggle('dark');
</script>
```

### Custom Utilities with @apply

**CSS:**
```css
@layer components {
  .btn {
    @apply px-4 py-2 rounded font-semibold transition;
  }
  
  .btn-primary {
    @apply bg-blue-500 text-white hover:bg-blue-600;
  }
  
  .btn-secondary {
    @apply bg-gray-500 text-white hover:bg-gray-600;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition;
  }
}
```

```html
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-secondary">Secondary Button</button>
<div class="card">Card content</div>
```

### Arbitrary Values

```html
<!-- Custom values -->
<div class="top-[117px]">Custom top value</div>
<div class="bg-[#1da1f2]">Custom color</div>
<div class="text-[14px]">Custom font size</div>
<div class="grid-cols-[200px_1fr_1fr]">Custom grid</div>
<div class="w-[calc(100%-2rem)]">Custom calc</div>
```

### Animation Chaining

```html
<!-- Sequential animations -->
<div class="
    animate-fade-in 
    animation-delay-100
    hover:animate-bounce
">
    Chained animations
</div>

<!-- Stagger children -->
<div class="space-y-4">
    <div class="animate-slide-in-left animation-delay-0">Item 1</div>
    <div class="animate-slide-in-left animation-delay-100">Item 2</div>
    <div class="animate-slide-in-left animation-delay-200">Item 3</div>
</div>
```

---

## Complete Examples

### Animated Button

**CSS:**
```css
.button {
    /* linear-gradient(angle, color stop1, color stop2) */
    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    /* transition: property duration timing-function delay */
    transition: all 0.3s ease;
    /* transform: translateY(value) */
    transform: translateY(0);
    /* box-shadow: offset-x | offset-y | blur-radius | spread-radius | color */
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

**Tailwind:**
```html
<button class="
    bg-gradient-to-r from-purple-500 to-purple-700
    text-white
    px-6 py-3
    rounded-lg
    border-none
    cursor-pointer
    transition-all duration-300
    hover:-translate-y-0.5
    hover:shadow-lg
    active:translate-y-0
    active:shadow-md
    shadow-md
">
    Animated Button
</button>
```

### Card with Hover Effect

**CSS:**
```css
.card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    /* box-shadow: h-offset v-offset blur color */
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    cursor: pointer;
}

.card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

.card img {
    transition: transform 0.3s ease;
}

.card:hover img {
    transform: scale(1.05);
}
```

**Tailwind:**
```html
<div class="
    group
    bg-white
    rounded-xl
    p-6
    shadow-md
    hover:shadow-2xl
    hover:-translate-y-2
    transition-all duration-300
    cursor-pointer
">
    <img src="image.jpg" class="rounded-lg group-hover:scale-105 transition-transform duration-300">
    <h3 class="text-xl font-bold mt-4 group-hover:text-blue-600 transition-colors">Card Title</h3>
    <p class="text-gray-600 mt-2">Card description</p>
</div>
```

### Loading Spinner

**CSS:**
```css
@keyframes spin {
    to { transform: rotate(360deg); }
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    /* animation: name duration timing-function iteration-count */
    animation: spin 1s linear infinite;
}
```

**Tailwind:**
```html
<div class="
    w-10 h-10
    border-4 border-gray-200
    border-t-blue-500
    rounded-full
    animate-spin
">
</div>
```

---

## Summary

### Key Differences

| Aspect | CSS | Tailwind |
|--------|-----|----------|
| **Approach** | Write custom CSS | Use utility classes |
| **File Size** | Can grow large | Purged unused classes |
| **Learning Curve** | Know CSS properties | Learn class names |
| **Customization** | Full control | Config-based |
| **Maintenance** | Separate CSS files | HTML-centric |
| **Reusability** | CSS classes | Component extraction |

### When to Use What

**Use CSS when:**
- Complex animations with many keyframes
- Very specific custom designs
- Need precise control
- Working on existing CSS codebase

**Use Tailwind when:**
- Rapid prototyping
- Consistent design system
- Team collaboration
- Want smaller production CSS

### Best Practices

1. **Use @apply for repeated patterns**
2. **Configure custom values in tailwind.config.js**
3. **Use PurgeCSS in production**
4. **Combine with CSS for complex animations**
5. **Use group/peer for parent-child interactions**
6. **Leverage responsive prefixes**
7. **Use dark mode classes**
8. **Extract components when needed**

---

## Quick Reference

### Most Used Classes

```html
<!-- Layout -->
flex, grid, block, inline-block, hidden

<!-- Spacing -->
m-4, p-4, mx-auto, space-x-4, gap-4

<!-- Sizing -->
w-full, h-screen, max-w-lg, min-h-screen

<!-- Typography -->
text-xl, font-bold, text-center, leading-relaxed

<!-- Colors -->
bg-blue-500, text-white, border-gray-300

<!-- Effects -->
shadow-lg, rounded-lg, opacity-50

<!-- Transitions -->
transition, duration-300, ease-in-out

<!-- Transforms -->
scale-110, rotate-45, translate-x-4

<!-- States -->
hover:, focus:, active:, disabled:, group-hover:

<!-- Responsive -->
sm:, md:, lg:, xl:, 2xl:
```

This guide covers all major aspects of Tailwind CSS with direct comparisons to regular CSS! 🚀
