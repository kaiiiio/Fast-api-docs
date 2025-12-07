# Frontend Performance Optimization: Core Web Vitals

Frontend performance optimization improves user experience and SEO. This guide covers Core Web Vitals and optimization techniques.

## Core Web Vitals

### Largest Contentful Paint (LCP)

**LCP** measures loading performance (should be < 2.5s).

```javascript
// Optimize LCP:
// - Optimize images
// - Preload critical resources
// - Reduce server response time
// - Eliminate render-blocking resources

// Preload critical resources
<link rel="preload" href="critical.css" as="style">
<link rel="preload" href="hero-image.jpg" as="image">
```

### First Input Delay (FID)

**FID** measures interactivity (should be < 100ms).

```javascript
// Optimize FID:
// - Reduce JavaScript execution time
// - Code splitting
// - Lazy load non-critical JS
// - Use Web Workers for heavy tasks

// Code splitting
const LazyComponent = lazy(() => import('./LazyComponent'));
```

### Cumulative Layout Shift (CLS)

**CLS** measures visual stability (should be < 0.1).

```javascript
// Optimize CLS:
// - Set image dimensions
// - Reserve space for ads
// - Avoid inserting content above existing
// - Use transform for animations

// Set image dimensions
<img src="image.jpg" width="800" height="600" alt="Image">
```

## Performance Optimization Techniques

### Code Splitting

```javascript
// React: Lazy loading
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LazyComponent />
        </Suspense>
    );
}
```

### Image Optimization

```javascript
// Lazy load images
<img 
    src="image.jpg" 
    loading="lazy" 
    alt="Image"
/>

// Responsive images
<img 
    srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
    sizes="(max-width: 600px) 480px, 800px"
    src="medium.jpg"
    alt="Responsive image"
/>
```

### Bundle Optimization

```javascript
// Tree shaking: Remove unused code
// Minification: Compress code
// Compression: Gzip/Brotli
// Caching: Browser caching
```

## Best Practices

1. **Optimize Images**: Compress, lazy load, use modern formats
2. **Code Splitting**: Split code into chunks
3. **Minify**: Minify CSS and JavaScript
4. **Cache**: Use browser caching
5. **Monitor**: Track Core Web Vitals

## Summary

**Frontend Performance Optimization:**

1. **Core Web Vitals**: LCP, FID, CLS
2. **Techniques**: Code splitting, image optimization
3. **Best Practice**: Optimize images, split code, minify
4. **Metrics**: Monitor Core Web Vitals
5. **Benefits**: Better UX, SEO, conversions

**Key Takeaway:**
Frontend performance optimization improves user experience. Focus on Core Web Vitals (LCP, FID, CLS). Optimize images, split code, minify assets. Use lazy loading and code splitting. Monitor performance metrics. Better performance improves SEO and conversions.

**Performance Strategy:**
- Optimize Core Web Vitals
- Code splitting
- Image optimization
- Minify assets
- Monitor metrics

**Next Steps:**
- Learn [Lighthouse](lighthouse_scoring.md) for auditing
- Study [Bundle Optimization](bundle_optimization.md) for size
- Master [Caching Strategies](../03_networking/caching_strategies.md) for performance

---

## 🎯 Interview Questions: Frontend

### Q1: Explain Core Web Vitals and frontend performance optimization techniques in detail. Discuss LCP, FID, CLS metrics, and provide comprehensive strategies for optimizing each metric. Include code examples showing optimization techniques.

**Answer:**

**Core Web Vitals Overview:**

Core Web Vitals are a set of metrics that measure real-world user experience on web pages. They focus on three aspects: loading performance, interactivity, and visual stability. These metrics are used by Google for SEO ranking and provide a standardized way to measure user experience.

**1. Largest Contentful Paint (LCP):**

**Definition:**
LCP measures loading performance by tracking when the largest content element becomes visible. It should be under 2.5 seconds for good user experience.

**What Counts as LCP:**
- `<img>` elements
- `<video>` elements with poster image
- Elements with background images
- Block-level elements containing text

**Optimization Strategies:**

**1. Optimize Images:**
```javascript
// ❌ Bad: Large unoptimized image
<img src="hero-image.jpg" alt="Hero">

// ✅ Good: Optimized, responsive image
<img 
    src="hero-image.webp" 
    srcset="hero-small.webp 480w, hero-medium.webp 800w, hero-large.webp 1200w"
    sizes="(max-width: 600px) 480px, 800px"
    width="800"
    height="600"
    alt="Hero"
    loading="eager"  // Load immediately (above fold)
/>

// Benefits:
// - WebP format: 25-35% smaller than JPEG
// - Responsive: Loads appropriate size
// - Dimensions set: Prevents layout shift
```

**2. Preload Critical Resources:**
```html
<!-- Preload critical CSS -->
<link rel="preload" href="critical.css" as="style">
<link rel="stylesheet" href="critical.css">

<!-- Preload critical font -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preload hero image -->
<link rel="preload" href="hero-image.webp" as="image">
```

**3. Reduce Server Response Time:**
```javascript
// Optimize server response
// - Use CDN
// - Enable compression (Gzip/Brotli)
// - Cache static assets
// - Optimize database queries
// - Use edge computing
```

**4. Eliminate Render-Blocking Resources:**
```html
<!-- ❌ Bad: Render-blocking CSS -->
<link rel="stylesheet" href="styles.css">

<!-- ✅ Good: Inline critical CSS -->
<style>
    /* Critical above-the-fold CSS */
    body { font-family: Arial; }
    .hero { background: #000; }
</style>

<!-- ✅ Good: Defer non-critical CSS -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>
```

**5. Optimize Web Fonts:**
```css
/* ✅ Good: Font display strategy */
@font-face {
    font-family: 'CustomFont';
    src: url('font.woff2') format('woff2');
    font-display: swap;  /* Show fallback immediately */
}

/* font-display options:
   - swap: Show fallback, swap when loaded
   - optional: Use fallback if font not loaded quickly
   - block: Block text until font loads (not recommended)
*/
```

**2. First Input Delay (FID):**

**Definition:**
FID measures interactivity by tracking the time from when a user first interacts with your page (click, tap, key press) to when the browser can respond. It should be under 100 milliseconds.

**What Affects FID:**
- Long JavaScript execution
- Large JavaScript bundles
- Main thread blocking
- Third-party scripts

**Optimization Strategies:**

**1. Code Splitting:**
```javascript
// ❌ Bad: Large bundle
import HeavyComponent from './HeavyComponent';
import AnotherHeavyComponent from './AnotherHeavyComponent';

// ✅ Good: Code splitting
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));
const AnotherHeavyComponent = lazy(() => import('./AnotherHeavyComponent'));

function App() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HeavyComponent />
        </Suspense>
    );
}

// Benefits:
// - Smaller initial bundle
// - Faster initial load
// - Components load on demand
```

**2. Reduce JavaScript Execution Time:**
```javascript
// ❌ Bad: Heavy computation on main thread
function processData(data) {
    // Heavy computation blocks main thread
    return data.map(item => {
        // Complex processing
        return heavyComputation(item);
    });
}

// ✅ Good: Use Web Workers
// main.js
const worker = new Worker('worker.js');
worker.postMessage(data);
worker.onmessage = (e) => {
    const result = e.data;
    // Update UI
};

// worker.js
self.onmessage = (e) => {
    const data = e.data;
    const result = data.map(item => {
        // Heavy computation in worker
        return heavyComputation(item);
    });
    self.postMessage(result);
};
```

**3. Defer Non-Critical JavaScript:**
```html
<!-- ❌ Bad: Blocking script -->
<script src="analytics.js"></script>

<!-- ✅ Good: Defer script -->
<script src="analytics.js" defer></script>

<!-- ✅ Good: Async script (if order doesn't matter) -->
<script src="analytics.js" async></script>
```

**4. Optimize Third-Party Scripts:**
```javascript
// ❌ Bad: Load all third-party scripts immediately
<script src="analytics.js"></script>
<script src="ads.js"></script>
<script src="chat.js"></script>

// ✅ Good: Load on demand
function loadAnalytics() {
    const script = document.createElement('script');
    script.src = 'analytics.js';
    script.async = true;
    document.body.appendChild(script);
}

// Load after user interaction or after page load
window.addEventListener('load', () => {
    setTimeout(loadAnalytics, 3000);  // Load after 3 seconds
});
```

**5. Minimize Main Thread Work:**
```javascript
// ✅ Good: Break up long tasks
function processLargeArray(array) {
    // Process in chunks
    const chunkSize = 100;
    let index = 0;
    
    function processChunk() {
        const chunk = array.slice(index, index + chunkSize);
        chunk.forEach(item => processItem(item));
        index += chunkSize;
        
        if (index < array.length) {
            // Yield to browser
            setTimeout(processChunk, 0);
        }
    }
    
    processChunk();
}
```

**3. Cumulative Layout Shift (CLS):**

**Definition:**
CLS measures visual stability by tracking unexpected layout shifts. It should be under 0.1 for good user experience.

**What Causes Layout Shifts:**
- Images without dimensions
- Ads, embeds, iframes without dimensions
- Dynamically injected content
- Web fonts causing FOIT/FOUT
- Actions that update DOM

**Optimization Strategies:**

**1. Set Image Dimensions:**
```html
<!-- ❌ Bad: No dimensions -->
<img src="image.jpg" alt="Image">

<!-- ✅ Good: Dimensions set -->
<img 
    src="image.jpg" 
    width="800" 
    height="600" 
    alt="Image"
>

<!-- Prevents layout shift when image loads -->
```

**2. Reserve Space for Ads/Embeds:**
```html
<!-- ❌ Bad: Ad without dimensions -->
<div id="ad-container"></div>
<script>
    // Ad loads, causes layout shift
    loadAd('ad-container');
</script>

<!-- ✅ Good: Reserve space -->
<div id="ad-container" style="width: 300px; height: 250px; min-height: 250px;">
    <!-- Ad loads here -->
</div>
```

**3. Avoid Inserting Content Above Existing:**
```javascript
// ❌ Bad: Insert above existing content
function showBanner() {
    const banner = document.createElement('div');
    banner.textContent = 'New banner';
    document.body.insertBefore(banner, document.body.firstChild);
    // Causes layout shift
}

// ✅ Good: Reserve space or use transform
function showBanner() {
    const banner = document.createElement('div');
    banner.textContent = 'New banner';
    banner.style.transform = 'translateY(-100%)';  // Start off-screen
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Animate in without layout shift
    requestAnimationFrame(() => {
        banner.style.transform = 'translateY(0)';
    });
}
```

**4. Use Transform for Animations:**
```css
/* ❌ Bad: Animating position causes reflow */
.element {
    position: relative;
    top: 0;
    transition: top 0.3s;
}
.element.animate {
    top: 100px;  /* Causes layout shift */
}

/* ✅ Good: Transform doesn't cause layout shift */
.element {
    transform: translateY(0);
    transition: transform 0.3s;
}
.element.animate {
    transform: translateY(100px);  /* No layout shift */
}
```

**5. Font Loading Strategy:**
```css
/* ✅ Good: Prevent FOIT/FOUT */
@font-face {
    font-family: 'CustomFont';
    src: url('font.woff2') format('woff2');
    font-display: swap;  /* Show fallback immediately */
}

/* Or use font-display: optional for better CLS */
@font-face {
    font-family: 'CustomFont';
    src: url('font.woff2') format('woff2');
    font-display: optional;  /* Use fallback if font not ready */
}
```

**Additional Performance Techniques:**

**1. Bundle Optimization:**
```javascript
// Tree shaking: Remove unused code
// Minification: Compress code
// Compression: Gzip/Brotli
// Code splitting: Split into chunks

// webpack.config.js
module.exports = {
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                },
            },
        },
    },
};
```

**2. Caching Strategies:**
```javascript
// Browser caching
// Service workers
// HTTP caching headers

// Service Worker
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
```

**3. Lazy Loading:**
```html
<!-- Lazy load images -->
<img src="image.jpg" loading="lazy" alt="Image">

<!-- Lazy load iframes -->
<iframe src="video.html" loading="lazy"></iframe>
```

**Performance Monitoring:**

**Measure Core Web Vitals:**
```javascript
// Using web-vitals library
import { getLCP, getFID, getCLS } from 'web-vitals';

getLCP(console.log);
getFID(console.log);
getCLS(console.log);

// Or use Chrome DevTools
// Performance tab → Record → Analyze
```

**System Design Consideration**: Performance optimization is crucial for:
1. **User Experience**: Fast, responsive applications
2. **SEO**: Google ranking factors
3. **Conversion**: Better performance = higher conversion
4. **Accessibility**: Faster for users on slow connections
5. **Cost**: Reduced bandwidth usage

Core Web Vitals (LCP, FID, CLS) measure real-world user experience. Optimize LCP by optimizing images, preloading resources, and reducing server response time. Optimize FID by code splitting, reducing JavaScript execution, and using Web Workers. Optimize CLS by setting image dimensions, reserving space for dynamic content, and using transform for animations. Monitor and measure performance continuously.

