# Frontend System Design: Multi-API Data Aggregation Challenge

## 🎯 Problem Statement
Build a dashboard for an e-commerce analytics platform that displays consolidated product performance data from multiple API endpoints.

### Requirements
- Fetch data from three different API endpoints.
- Handle API request errors appropriately.
- Combine and transform data into a unified format.
- Create a search/filter function for the aggregated data.
- Implement caching to prevent redundant API calls.

---

## 🏗️ Implementation

### 1. Mock API Endpoints
```javascript
function fetchProductDetails() {
  return Promise.resolve([
    { id: "P1", name: "Wireless Headphones", category: "Electronics", price: 89.99 },
    { id: "P2", name: "Running Shoes", category: "Footwear", price: 129.95 },
    { id: "P3", name: "Coffee Maker", category: "Kitchen", price: 149.99 },
    { id: "P4", name: "Yoga Mat", category: "Fitness", price: 45.50 }
  ]);
}

function fetchProductInventory() {
  return Promise.resolve([
    { productId: "P1", warehouseStock: 230, storeStock: 34, reserved: 12, status: "in_stock" },
    { productId: "P2", warehouseStock: 120, storeStock: 22, reserved: 5, status: "low_stock" },
    { productId: "P3", warehouseStock: 0, storeStock: 0, reserved: 0, status: "out_of_stock" },
    { productId: "P4", warehouseStock: 67, storeStock: 15, reserved: 2, status: "in_stock" }
  ]);
}

function fetchProductAnalytics() {
  return Promise.resolve([
    { product_id: "P1", views: 1204, conversion_rate: 0.12, revenue_mtd: 5620.32 },
    { product_id: "P2", views: 876, conversion_rate: 0.08, revenue_mtd: 2154.99 },
    { product_id: "P4", views: 315, conversion_rate: 0.04, revenue_mtd: 982.45 }
    // Note: P3 data is missing from this endpoint
  ]);
}
```

### 2. Aggregation Logic
Using a caching mechanism and parallel fetching.

```javascript
const cache = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000 // 5 minutes
};

async function aggregateProductData() {
  // Check Cache
  if (cache.data && (Date.now() - cache.timestamp < cache.TTL)) {
    console.log("Returning from cache...");
    return cache.data;
  }

  try {
    // Parallel Fetching
    const [details, inventory, analytics] = await Promise.all([
      fetchProductDetails(),
      fetchProductInventory(),
      fetchProductAnalytics()
    ]);

    // Data Transformation
    const aggregated = details.map(product => {
      const inv = inventory.find(i => i.productId === product.id) || {};
      const stats = analytics.find(a => a.product_id === product.id) || {};

      return {
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        inventory: {
          total: (inv.warehouseStock || 0) + (inv.storeStock || 0),
          available: (inv.warehouseStock || 0) + (inv.storeStock || 0) - (inv.reserved || 0),
          status: inv.status || "unknown"
        },
        performance: {
          views: stats.views || 0,
          conversionRate: stats.conversion_rate || 0,
          revenue: stats.revenue_mtd || 0
        }
      };
    });

    // Update Cache
    cache.data = aggregated;
    cache.timestamp = Date.now();

    return aggregated;
  } catch (error) {
    console.error("Error aggregating data:", error);
    throw new Error("Failed to fetch product data. Please try again later.");
  }
}
```

### 3. Search & Filter Functionality
```javascript
function searchProducts(aggregatedData, searchTerm = "", filters = {}) {
  const { category, status, minPrice, maxPrice } = filters;

  return aggregatedData.filter(product => {
    // 1. Name Search (Case-insensitive)
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Category Filter
    const matchesCategory = !category || product.category === category;

    // 3. Status Filter
    const matchesStatus = !status || product.inventory.status === status;

    // 4. Price Range Filter
    const matchesPrice = (!minPrice || product.price >= minPrice) && 
                         (!maxPrice || product.price <= maxPrice);

    return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
  });
}
```

---

## 🧠 Deep Dive: Solving Edge Cases
1. **Missing Data**: Used default values (e.g., `|| 0`, `|| {}`) to handle products missing from specific endpoints (like `P3` in analytics).
2. **Parallel Performance**: `Promise.all` ensures we don't block requests sequentially, reducing latency.
3. **Caching**: Implemented a TTL (Time To Live) based cache to prevent excessive API calls while keeping data reasonably fresh.
4. **Error Handling**: Wrapped in `try-catch` to provide a clean error message to the frontend instead of crashing.
