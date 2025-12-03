// 2. "The Flash Sale Disaster"
// Context: Your e-commerce startup is running a "Black Friday" flash sale. You have 100 units of a Playstation 5. At 10:00 AM, 5,000 users click "Buy Now" simultaneously.

// The Bug: Your database shows inventory: 0, but your payment gateway successfully charged 142 users. You just sold 42 items you don't have. The CTO is yelling.

// The Task: Write a backend endpoint purchase_item(item_id) that:

// Decrements inventory count.

// Returns True (Success) or False (Out of Stock).

// Strict Constraint: You must never oversell (Consistency > Availability).

// Performance: It cannot just lock the entire table, or no one else can buy other items.