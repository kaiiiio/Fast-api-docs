# Mentorship Guide: Cyber-Resilient Infrastructure for Critical Sectors

## Problem Overview
Proactive, resilient security for Healthcare (IoT), Agriculture (Precision Farming), and Smart Cities (SCADA/Utilities).

## 1. Solution Approaches & Architectures

### A. Zero Trust Architecture (ZTA)
*   **Core Concept**: "Never Trust, Always Verify." Every request within the network must be authenticated.
*   **Micro-segmentation**: Isolating different parts of the city grid so a hack in "Street Lights" doesn't affect "Power Control."

### B. AI-Powered Anomaly Detection (SIEM/SOAR)
*   Using Machine Learning to detect unusual patterns (e.g., a medical device sending 1GB of data to an external IP at 2 AM).
*   **SOAR**: Security Orchestration, Automation, and Response (automated "kill switches").

### C. Digital Twin for Security Sandboxing
*   Running a "Virtual Copy" of the Smart City or Hospital network. Test attacks on the twin first to see their impact without breaking the real system.

## 2. Advanced Concepts to Look For
*   **SCADA Security**: Understanding protocols like Modbus/DNP3 used in power grids and water systems.
*   **Honeytokens/Honeypots**: Setting traps for hackers to detect them early.
*   **Air-Gap Communication**: How to manage updates for systems that aren't (or shouldn't be) connected to the public internet.

## 3. Mentorship & Judging Questions

### Mentorship (To challenge the team)
*   "If an attacker gains control of a 'Smart Tractor' in a field, how do you isolate that single device without stopping the whole farm's operations?"
*   "How do you handle 'False Positives'? If your AI thinks the Surgeon's iPad is a hacker and shuts it down mid-surgery, that's a disaster."
*   "What is your 'Business Continuity Plan'? If the main network is down, can the Hospital still function in 'Emergency Mode'?"

### Judging (To evaluate the solution)
*   "Explain the 'Defence-in-Depth' layers in your architecture. If the firewall fails, what is the next layer?"
*   "How does your system handle 'Supply Chain Attacks' (e.g., a hack through a 3rd party library used in your code)?"
*   "Does your solution account for 'Physical Security'? (e.g., someone plugging a USB into a city sensor on the street)."

## 4. Judging Criteria
*   **Time to Detect/Respond**: How fast is the system at catching and stopping an attack?
*   **Architectural Robustness**: Is the security 'bolted on' or 'built-in'?
*   **Compliance**: Does it satisfy standards like ISO 27001 or HIPAA?
