// Context: You are integrating a Payment Gateway (like Stripe/PayPal) for a ride-sharing app. User A has a poor 4G connection. They click "Pay $50" -> Spinner spins -> Connection drops -> They click "Pay $50" again.

// The Bug: Your server logs show two distinct POST requests, 200ms apart. You charged the user $100. The user is furious. The CEO is asking why your code didn't catch this.

// The Task: Implement an Idempotent Payment System that guarantees Exactly-Once Processing, even if the client sends the same request 10 times.

// Constraints:

// Network partitions happen: You might charge the card successfully at Stripe, but your database crashes before you can save "Order Paid."

// Race Conditions: The two requests might arrive at two different web servers at the exact same millisecond.