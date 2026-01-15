# Industrial System Design Solutions (Frontend & High-Level)

This document provides system design solutions for 16 critical problems, framed for Senior Frontend/Full-stack roles.

---

### 1. Design Twitter (Feed System)
*   **Detailed Solution**: [01_twitter_design.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/01_twitter_design.md)
*   **Key Concern**: Real-time updates, handling celeb tweets ("Fan-out").
*   **Solution**: Hybrid approach. Push model for small users; Pull model for celebs.
*   **Frontend**: Infinite scroll with windowing, optimistic UI for likes/tweets, WebSockets for notifications.

### 2. Design Aarogya Setu (Contact Tracing)
*   **Detailed Solution**: [02_aarogya_setu.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/02_aarogya_setu.md)
*   **Key Concern**: Privacy, Bluetooth Low Energy (BLE) scanning, massive data ingestion.
*   **Solution**: BLE for proximity; Centralized/Decentralized logs.
*   **Frontend**: Background sync (Service Workers), secure local storage (IndexedDB), high-performance map visualization for "Hotspots".

### 3. Design a Load Balancer (Frontend Perspective)
*   **Detailed Solution**: [03_load_balancer.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/03_load_balancer.md)
*   **Key Concern**: Distribution of traffic.
*   **Frontend Impact**: Sticky sessions (important for some legacy auth), SSL Termination (happens at LB).
*   **Algorithm**: Round Robin, Least Connections, IP Hash.

### 4. Design a URL Shortener (TinyURL)
*   **Detailed Solution**: [04_url_shortener.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/04_url_shortener.md)
*   **Key Concern**: Read-heavy traffic, unique ID generation (Base62).
*   **Frontend**: Analytics dashboard showing click counts, QR code generation, browser-side redirection logic.

### 5. Design a Logging System
*   **Detailed Solution**: [05_logging_system.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/05_logging_system.md)
*   **Key Concern**: Not blocking the main thread, massive write operations.
*   **Frontend**: Batching logs (e.g., send in groups of 10), filtering sensitive data, using `navigator.sendBeacon` for "Unload" logs.

### 6. Design Google Play Store (App Distribution)
*   **Detailed Solution**: [06_google_play_store.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/06_google_play_store.md)
*   **Key Concern**: Search, large asset delivery (CDN), versioning.
*   **Frontend**: Progressive Web App (PWA) support, delta updates (only download what's changed), review/rating management.

### 7. Design ZoomCar App (Rental LLD)
*   **Detailed Solution**: [07_zoomcar_design.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/07_zoomcar_design.md)
*   **Key Concern**: Status management, real-time location.
*   **Frontend**: Google Maps API integration, Polling vs WebSockets for car availability, complex booking flow state machine (XState).

### 8. Design an E-commerce Platform
*   **Detailed Solution**: [08_ecommerce_platform.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/08_ecommerce_platform.md)
*   **Key Concern**: Inventory consistency, search scaling.
*   **Frontend**: Micro-frontends (Search, Cart, Checkout), SSR/ISR for Product Pages, dynamic pricing.

### 9. Design a Recommendation System
*   **Detailed Solution**: [09_recommendation_system.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/09_recommendation_system.md)
*   **Key Concern**: Low-latency personalized content.
*   **Architecture**: User event tracking -> Data pipeline -> ML Model -> API response.
*   **Frontend**: Skeleton screens for recommended sections, A/B testing frameworks.

### 10. Design of Order Management System (OMS)
*   **Detailed Solution**: [10_order_management.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/10_order_management.md)
*   **Key Concern**: Atomic transactions across services (Saga pattern).
*   **Frontend**: Complex multi-step forms, real-time status tracker (Timeline view), robust error handling for failed payments.

### 11. Design an App for Waste Management
*   **Detailed Solution**: [11_waste_management.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/11_waste_management.md)
*   **Key Concern**: Geographic route optimization, citizen reporting.
*   **Frontend**: Camera integration (for reporting photos), GPS tracking, offline mode for workers in basement/remote areas.

### 12. Design Library Management System (LLD)
*   **Detailed Solution**: [12_library_management.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/12_library_management.md)
*   **Key Concern**: Fine management, availability status.
*   **Frontend**: Search filters (Author, Category, Year), Barcode/QR scanner integration for book return.

### 13. Design a Warehouse Management System (WMS)
*   **Detailed Solution**: [13_warehouse_management.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/13_warehouse_management.md)
*   **Key Concern**: Inventory tracking, worker efficiency (picking/packing).
*   **Frontend**: Rugged device optimizations, high-speed data entry, barcode scanning, heatmaps for inventory flow.

### 14. Design a Reservation System for Parking Lot
*   **Detailed Solution**: [14_parking_lot.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/14_parking_lot.md)
*   **Key Concern**: Real-time spot availability.
*   **Frontend**: Interactive map of parking spots (Canvas/SVG), real-time updates via SSE, dynamic pricing based on occupancy.

### 15. Design a Real-time Inventory Tracking System
*   **Detailed Solution**: [15_inventory_tracking.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/15_inventory_tracking.md)
*   **Key Concern**: Extremely low latency, high throughput.
*   **Frontend**: Delta updates (don't send fixed fields), throttling graph re-renders, notification alerts for "Out of Stock".

### 16. Design a Rating System for E-commerce
*   **Detailed Solution**: [16_rating_system.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/frontend-knowledge-base/react/machine_coding/system_design_solutions/16_rating_system.md)
*   **Key Concern**: Anti-spam, aggregation (weighted average).
*   **Frontend**: Star rating component (accessibility-friendly), image upload previews, helpfulness votes, optimistic UI.
