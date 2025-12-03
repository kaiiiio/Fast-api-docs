// The Zombie Crawler
// Context: You are building an internal SEO tool to archive your company's documentation. The documentation links to itself frequently (e.g., "See Page A" -> "See Page B" -> "See Page A").

// The Bug: You started the crawler last night. By morning, your server crashed with OutOfMemoryError. Upon reboot, the crawler started over from the homepage, losing 10 hours of work.

// he Task: Design a Stateful, Resilient Crawler that:

// Deduplication: Never visits the same URL twice (even if linked 1,000 times).

// Resumability: If the script dies (kill -9), it resumes exactly where it left off.

// Politeness: Never hits the same domain more than once per second.