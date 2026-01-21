# Frontend System Design: Infinite Scroll News Feed

## 🎯 Problem Statement
**Challenge**: Build a Facebook/Twitter-style feed that scales as the user scrolls indefinitely, maintaining 60FPS and low memory usage.

## 🏗️ Virtualization & Memory
### 1. Windowing (Virtualization)
- **Concept**: If the feed has 10,000 posts, only keep ~20 in the DOM.
- **Library**: `react-window` or `react-virtualized`.
- **Custom**: Use an absolute-positioned container where top offsets are calculated based on item heights.

### 2. Dynamic Height Handling
- **Problem**: Posts have varying heights (text vs image vs video).
- **Solution**: **ResizeObserver**. Measure the height of the item once rendered and update the virtual list offset map dynamically.

## 🧠 Technical Deep Dive
- **Sub-grid Partitioning**: Divide the feed into "Blocks" of 50 items. Off-screen blocks are converted to simple `div` placeholders with the same height.
- **Prefetching**: Logic to fetch `page + 1` when the user is 2 screens away from the bottom.
- **State Management**: Persist "Scroll Position" in SessionStorage so the user doesn't lose their place on refresh.

## 🚀 Performance Metrics
- **FPS**: Consistent 60fps during scroll.
- **DOM Node Count**: Constant (e.g., < 200 nodes regardless of total list size).
- **Time to Interactive**: < 1.5 seconds.
