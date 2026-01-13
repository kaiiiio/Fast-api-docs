# Mentorship Guide: National-Scale Digital Public Infrastructure

## Problem Overview
Designing a unified backbone for fragmented services (Healthcare, Agriculture, Smart Cities) that is scalable, modular, and interoperable.

## 1. Solution Approaches & Architectures

### A. The "India Stack" Inspired Modular Approach
*   **Core Concept**: Build "Legos" of digital services.
*   **Identity Layer**: Unified Auth (OAuth2/OpenID Connect) across all services.
*   **Payment Layer**: Unified interface for subsidies/billing.
*   **Data Exchange**: Standardized schemas (JSON-LD) for interoperability.

### B. Micro-Kernel Architecture
*   A lightweight core handling service orchestration, security, and logging.
*   Domain-specific "Plug-ins" for Agriculture (IoT), Health (Telemedicine), and Urban (Sensors).

### C. Event-Driven Backbone
*   **Tech**: Apache Kafka or RabbitMQ.
*   **Why**: Handles asynchronous high-load interactions (e.g., thousands of farmers updating crop status simultaneously).

## 2. Advanced Concepts to Look For (and Expose to Participants)
*   **Interoperability Standards**: 
    *   **Healthcare**: FHIR (Fast Healthcare Interoperability Resources).
    *   **Agriculture**: ADAPT (AgGateway).
    *   **Urban**: NGSI-LD (Context Information Management).
*   **API Management**: Using an API Gateway (Kong, Tyk) for rate limiting and security at scale.
*   **Observability**: Distributed tracing (OpenTelemetry) to identify bottlenecks in national-scale traffic.

## 3. Mentorship & Judging Questions

### Mentorship (To challenge the team)
*   "How does your system handle a total network outage in a rural village? Is there an offline-sync mechanism?" (Local-first architecture).
*   "If the Health department changes its data format, how do you prevent the Smart City dashboard from breaking? (Discuss Schema Versioning)."
*   "How do you ensure that adding a new 'Education' module doesn't require restarting the 'Healthcare' module? (Hot-swapping/Dynamic Micro-kernels)."

### Judging (To evaluate the solution)
*   "Explain your choice of messaging system for the backbone. Why Kafka over RabbitMQ (or vice versa) for a national scale?"
*   "How do you handle 'Data Locality'? If some states have strict laws about where data is stored, how does your cloud-native infra handle it?"
*   "What is your strategy for 'Load Balancing' during a national emergency (e.g., a pandemic) when traffic spikes 1000x?"

## 4. Judging Criteria (Evaluation Checklist)
*   **Scalability**: Can it handle 100M+ users? (Stateless design, database partitioning).
*   **Extensibility**: How easy is it to add a 4th sector (e.g., Education)?
*   **Resilience**: What happens when the primary database fails?
*   **Inclusivity**: Does it support multiple languages and low-bandwidth scenarios?
