# Frontend System Design: Large Scale Image Gallery

## 🎯 Problem Statement
**Challenge**: Design a high-performance image gallery (like Unsplash or Google Photos) that handles millions of images, ensures fast initial load, and provides a smooth browsing experience.

## 🏗️ Architecture: Progressive Loading
### 1. Data Flow
- **Thumbnail Service**: Generates multiple resolutions (Tiny, Blur, Small, Full).
- **CDN Strategy**: Edge caching with Cloudfront/Akamai.
- **Client Processing**: Web Workers for decoding images to prevent Main-Thread blocking.

### 2. Rendering Patterns
- **Virtual Scrolling**: Only render images currently in the viewport + a small buffer.
- **Intersection Observer**: Trigger high-res loading only when the image is 80% visible.
- **Priority Hints**: Use `fetchpriority="high"` for the first 3 images.

## 🧠 Deep Dive: Performance Techniques
- **LQIP (Low Quality Image Placeholder)**: Use 20px blurred versions or Base64 encoded strings in the initial HTML.
- **Aspect Ratio Boxes**: Use `aspect-ratio` CSS or padding-bottom hack to prevent **Layout Shift (CLS)** before images load.
- **WebP/AVIF**: Serve next-gen formats based on the `Accept` header.

## 📊 Performance Metrics
- **LCP (Largest Contentful Paint)**: < 1.2 seconds.
- **CLS (Cumulative Layout Shift)**: < 0.05.
- **Memory Management**: Cleanup hidden image components to prevent heap overflow.
