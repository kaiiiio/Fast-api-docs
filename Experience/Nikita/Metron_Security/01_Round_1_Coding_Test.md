
<!-- 
We follow a simple three (steps) process - 

Code Test - A 90 mins challenge to see if you have your fundamentals right

Technical Discussion - One-on-One session (1 hour) with our Engineering Manager

Offer - Bingo! And, that’s it. We will roll out an offer letter. 

Job Summary

We’re on the lookout for a Full Stack Developer who loves pitting the whole picture together from backend services to slick user interfaces. You’ll be the one building integrations between big-name security platforms, setting up smooth data pipelines, and creating automated responses that make life easier for security teams. Some days you’ll be knee-deep in backend code; other days you’ll be polishing up the frontend so everything just works.

About Us
At Metron Security, we help top cybersecurity companies make their tools talk to each other. Our engineers build smart integrations with platforms like Splunk, IBM QRadar, ServiceNow, CrowdStrike, Cybereason—you name it. We’re all about a developer-first culture: creativity, ownership, and always learning something new.

Why You’ll Love Working with Us
A true developer-first space where your ideas actually get built.
Hands-on time with 250+ security platforms (seriously, there’s a lot).
You’ll work directly with customers and see how your code makes a difference.
A fast-moving, growth-focused team that still values work-life balance—no weekend grind and only the odd evening call.
What We’re Looking For

We’d love to meet someone who can jump between backend and frontend without breaking a sweat and enjoys figuring out how all the moving parts fit together.

Must-Have Skills
Solid coding chops—TypeScript/JavaScript or Python is great, but use whatever gets the job done.
Know how to design and build backend services, APIs, and data pipelines.
Experience creating user-facing features with modern frontend frameworks (React, Angular, or Vue).
Strong debugging and problem-solving instincts across the whole stack.
Familiar with cloud platforms like AWS, GCP, or Azure.
Comfortable working in Agile teams (think sprints, design chats, user stories).
An eye for security best practices, both backend and frontend.
Bonus Points If You
Have built integrations with enterprise systems or security tools.
Use testing frameworks like Jest, Cypress, or PyTest.Have played with Docker or Kubernetes.
Have launched scalable apps in the cloud.
Contribute to open source or like sharing your tech tips in public.
Your Impact
Build integrations that let major security platforms share data and automate responses.
Create and maintain backend services and APIs while making sure the front end is smooth and easy to use.
Work side-by-side with teammates and customers to ship reliable, end-to-end solutions.
Dig into tricky bugs and keep systems running fast and stable.
Stay curious and keep up with new tech and security best practices.
Our Ideal Teammate
Thinks about both backend architecture and frontend user experience.
Communicates clearly and works well with teammates and customers.
Takes pride in building solid, maintainable code that actually makes a difference.
Learns new languages, frameworks, or tools without hesitation.
Brings a positive, “let’s figure it out together” attitude.

 -->

# Round 1: Coding Test (90 Minutes)

Metron Security focuses on **"Practical Coding"** rather than just LeetCode puzzles. They want to see how you handle real-world data and APIs.

## ⏱️ Test Structure
- **Duration:** 90 Minutes
- **Format:** Usually 2-3 questions.
- **Goal:** Assess fundamentals, clean code, and bug-solving instincts.

---

## 🎯 Common Coding Themes (Based on Research)

### 1. Data Parsing & Transformation (The "Security" Way)
Since Metron builds integrations, you'll likely get a task to parse logs or normalize data.
- **Example:** You get a JSON from Splunk and need to convert it into a format understandable by ServiceNow.
- **Focus:** 
    - Handling nested objects safely.
    - Edge cases (null values, missing fields).
    - Efficiently filtering large arrays of security events.

### 2. API Integration (Mocking the "Talk")
Designing a small function to fetch data from an endpoint and handle common HTTP issues.
- **Focus:**
    - Error handling (Retries, 404s, 500s).
    - Async/Await patterns.
    - Rate limiting logic (e.g., "Don't hit the API more than 5 times per second").

### 3. String Manipulation & Security
- **Example:** Sanitize a list of URLs or IP addresses.
- **Focus:** Regex patterns, input validation (escaping special characters).

---

## 🏗️ Data Structures You MUST Know
Metron expects you to know how to organize data efficiently.
- **Arrays & Sets:** Removing duplicates from a list of security logs (use `Set` for $O(1)$ lookups).
- **Hash Maps (Objects/Dictionaries):** Counting frequencies of IP addresses to detect a DDoS attack.
- **Trees/Graphs:** Representing hierarchical organizational structure (RBAC) or network topologies.
- **Stacks/Queues:** Handling an incoming stream of alerts (First-In-First-Out).

---

## 🏛️ OOPs Fundamentals (JavaScript/Python)
*Show them you write "Scalable" code, not just "Scripts".*
- **Encapsulation:** Creating a `SecurityScanner` class with private properties for API keys.
- **Inheritance:** A base `Integration` class that `SplunkIntegration` and `CrowdStrikeIntegration` extend.
- **Abstraction:** Defining an interface for `sendAlert()` that works the same regardless of the platform.
- **Polymorphism:** Overriding a `parseData()` method in different subclasses.

---

## 🛠️ Practical Practice Problems (DIY)

| Problem | Description | Skill Tested |
| :--- | :--- | :--- |
| **Log Analyzer** | Write a function that takes a raw text log file and extracts all "CRITICAL" errors with timestamps. | String manipulation, RegEx |
| **API Aggregator** | Fetch user data from two different mock APIs and merge them based on `email` ID. | Async/Await, Array `Reduce/Map` |
| **Rate Limiter** | Implement a simple function `fetchWithLimit` that ensures only $N$ calls are made in $M$ seconds. | Closures, Timeouts |

---

## 💡 Quick Tips for the 90 Mins
1.  **Read the Instructions Twice:** Metron values "accuracy" over "speed." If they ask for a specific error format, follow it exactly.
2.  **Clean Code Matters:** Use meaningful variable names (`securityEvent` instead of `e`).
3.  **Comments:** Add brief comments explaining *why* you chose a certain approach.
4.  **Test for Edge Cases:** What if the input is `[]` or `null`? Show them you're a defensive coder.
