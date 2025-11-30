# Spring Boot Backend Mastery

A comprehensive knowledge base for building production-grade Spring Boot backends, covering everything from fundamentals to advanced system design patterns.

## 📚 Table of Contents

### 00 - Introduction
- [Why Spring Boot Over Others?](00_introduction/why_spring_boot_over_others.md)
- [Reactive vs Imperative Backends](00_introduction/reactive_vs_imperative_backends.md)
- [When to Use Spring Boot vs FastAPI vs Express](00_introduction/when_to_use_spring_boot_vs_fastapi_vs_express.md)
- [Architecture Philosophy](00_introduction/architecture_philosophy.md)

### 01 - Project Structure
- [Recommended Layout](01_project_structure/recommended_layout.md)
- [Dependency Injection Best Practices](01_project_structure/dependency_injection_best_practices.md)
- [Config Management with Properties](01_project_structure/config_management_with_properties.md)
- [Monorepo vs Microservices Considerations](01_project_structure/monorepo_vs_microservices_considerations.md)

### 02 - Data Layer Fundamentals
- [Data Modeling Principles](02_data_layer_fundamentals/data_modeling_principles.md)
- [Choosing Database Type](02_data_layer_fundamentals/choosing_database_type.md)
- [Connection Pooling and Lifecycles](02_data_layer_fundamentals/connection_pooling_and_lifecycles.md)
- [Transactions in Spring](02_data_layer_fundamentals/transactions_in_spring.md)
- [Data Validation vs Business Validation](02_data_layer_fundamentals/data_validation_vs_business_validation.md)

### 03 - Relational Databases (JPA)
- [JPA Hibernate Deep Dive](03_relational_databases_jpa/jpa_hibernate_deep_dive.md)
- [JPA vs JDBC vs JOOQ](03_relational_databases_jpa/jpa_vs_jdbc_vs_jooq.md)
- [Entity Manager Lifecycle](03_relational_databases_jpa/entity_manager_lifecycle.md)
- [CRUD with Repository Pattern](03_relational_databases_jpa/crud_with_repository_pattern.md)
- [Advanced Querying](03_relational_databases_jpa/advanced_querying.md)
- [Pagination Strategies](03_relational_databases_jpa/pagination_strategies.md)
- [Soft Delete Patterns](03_relational_databases_jpa/soft_delete_patterns.md)
- [Composite Primary Keys](03_relational_databases_jpa/composite_primary_keys.md)
- [Relationships Explained](03_relational_databases_jpa/relationships_explained.md)
- [Liquibase Flyway Migrations](03_relational_databases_jpa/liquibase_flyway_migrations.md)

### 04 - PostgreSQL Specific
- [JSONB and Full Text Search](04_postgresql_specific/jsonb_and_full_text_search.md)
- [Array and Enum Types](04_postgresql_specific/array_and_enum_types.md)
- [pgvector for Embeddings](04_postgresql_specific/pgvector_for_embeddings.md)
- [Creating Vector Index](04_postgresql_specific/creating_vector_index.md)
- [Hybrid Search: SQL Plus Vector](04_postgresql_specific/hybrid_search_sql_plus_vector.md)
- [Connection URI and SSL Config](04_postgresql_specific/connection_uri_and_ssl_config.md)

### 05 - NoSQL (MongoDB)
- [When to Choose MongoDB](05_nosql_mongodb/when_to_choose_mongodb.md)
- [Spring Data MongoDB Setup](05_nosql_mongodb/spring_data_mongodb_setup.md)
- [Data Modeling for Document DBs](05_nosql_mongodb/data_modeling_for_document_dbs.md)
- [Aggregation Pipeline in Spring](05_nosql_mongodb/aggregation_pipeline_in_spring.md)
- [Indexing in MongoDB](05_nosql_mongodb/indexing_in_mongodb.md)
- [Change Streams for Events](05_nosql_mongodb/change_streams_for_events.md)
- [MongoDB Atlas Vector Search](05_nosql_mongodb/mongodb_atlas_vector_search.md)
- [Reactive MongoDB Driver](05_nosql_mongodb/reactive_mongodb_driver.md)

### 06 - Caching Layer
- [Redis Integration](06_caching_layer/redis_integration.md)
- [Cache Strategies](06_caching_layer/cache_strategies.md)
- [Caching Query Results](06_caching_layer/caching_query_results.md)
- [Cache Invalidation Patterns](06_caching_layer/cache_invalidation_patterns.md)
- [Using Redis Streams for Messaging](06_caching_layer/using_redis_streams_for_messaging.md)

### 07 - Background Processing
- [Async Methods vs Spring Batch](07_background_processing/async_methods_vs_spring_batch.md)
- [Spring Batch Architecture](07_background_processing/spring_batch_architecture.md)
- [Sending Tasks with RabbitMQ](07_background_processing/sending_tasks_with_rabbitmq.md)
- [Retry with Exponential Backoff](07_background_processing/retry_with_exponential_backoff.md)
- [Task Idempotency and Deduplication](07_background_processing/task_idempotency_and_deduplication.md)
- [Handling Task Results and Timeouts](07_background_processing/handling_task_results_and_timeouts.md)
- [Monitoring with Actuator and Prometheus](07_background_processing/monitoring_with_actuator_and_prometheus.md)

### 08 - AI and LLM Integration
- [Structured Output with Java Records](08_ai_and_llm_integration/structured_output_with_java_records.md)
- [AI Call Retry and Circuit Breaking](08_ai_and_llm_integration/ai_call_retry_and_circuit_breaking.md)
- [AI Cost Tracking](08_ai_and_llm_integration/ai_cost_tracking.md)
- [AI Logging with Traceability](08_ai_and_llm_integration/ai_logging_with_traceability.md)
- [Embedding Generation and Storage](08_ai_and_llm_integration/embedding_generation_and_storage.md)
- [Prompt Versioning and A/B Testing](08_ai_and_llm_integration/prompt_versioning_and_ab_testing.md)

### 09 - Authentication and Security
- [JWT Implementation](09_authentication_and_security/jwt_implementation.md)
- [Password Hashing Best Practices](09_authentication_and_security/password_hashing_best_practices.md)
- [Role-Based Access Control](09_authentication_and_security/role_based_access_control.md)
- [Securing Database Connections](09_authentication_and_security/securing_database_connections.md)
- [Encrypting PII at Rest](09_authentication_and_security/encrypting_pii_at_rest.md)
- [GDPR Compliance Design](09_authentication_and_security/gdpr_compliance_design.md)

### 10 - Real-Time and Sockets
- [Spring Boot WebSockets: STOMP, SockJS](10_real_time_and_sockets/01_spring_websockets_stomp.md)
- [Raw WebSockets vs STOMP](10_real_time_and_sockets/02_raw_websockets_vs_stomp.md)
- [Securing WebSockets (Token Auth)](10_real_time_and_sockets/03_securing_websockets.md)
- [Scaling with Message Broker (RabbitMQ/Redis)](10_real_time_and_sockets/04_scaling_with_message_broker.md)
- [RSocket: Reactive Streams](10_real_time_and_sockets/05_rsocket_reactive_streams.md)
- [Testing WebSockets](10_real_time_and_sockets/06_testing_websockets.md)

### 11 - Testing
- [Unit Testing Services](11_testing/unit_testing_services.md)
- [Integration Testing with Testcontainers](11_testing/integration_testing_with_testcontainers.md)
- [Mocking External APIs and AI](11_testing/mocking_external_apis_and_ai.md)
- [Testing Repositories](11_testing/testing_repositories.md)
- [JUnit Fixtures and Setup](11_testing/junit_fixtures_and_setup.md)
- [Contract Testing for APIs](11_testing/contract_testing_for_apis.md)

### 12 - Observability
- [Structured Logging with SLF4J](12_observability/structured_logging_with_slf4j.md)
- [CQRS for Read Heavy Systems](14_system_design_patterns/cqrs_for_read_heavy_systems.md)

### 15 - Interview Mastery
- [How Spring Boot Handles Concurrency](15_interview_mastery/how_spring_boot_handles_concurrency.md)
- [Explain Your Data Model for an AI Job Platform](15_interview_mastery/explain_your_data_model_for_an_ai_job_platform.md)
- [Design a Resume Parsing Pipeline](15_interview_mastery/design_a_resume_parsing_pipeline.md)
- [How Would You Debug a Slow Query](15_interview_mastery/how_would_you_debug_a_slow_query.md)
- [Tradeoffs: SQL vs MongoDB for AI Apps](15_interview_mastery/tradeoffs_sql_vs_mongodb_for_ai_apps.md)

### 16 - File Storage and Media
- [File Upload and Download Mastery](16_file_storage_and_media/01_file_upload_download.md)
- [S3 Integration (AWS SDK v2)](16_file_storage_and_media/02_s3_integration.md)
- [Image Processing (Thumbnailator)](16_file_storage_and_media/03_image_processing.md)
- [Video Streaming (Range Requests)](16_file_storage_and_media/04_video_streaming.md)

## 🎯 Learning Path

### Beginner Path
1. Start with **00 - Introduction** to understand Spring Boot fundamentals
2. Learn **01 - Project Structure** for proper organization
3. Master **02 - Data Layer Fundamentals** for database basics
4. Practice with **03 - Relational Databases (JPA)** for SQL knowledge

### Intermediate Path
5. Explore **04 - PostgreSQL Specific** features
6. Understand **06 - Caching Layer** for performance
7. Learn **09 - Authentication and Security**
8. Master **10 - Testing** for quality assurance

### Advanced Path
9. Dive into **05 - NoSQL (MongoDB)** if needed
10. Implement **07 - Background Processing** for async tasks
11. Integrate **08 - AI and LLM Integration** for modern apps
12. Set up **11 - Observability** for production monitoring
13. Optimize with **12 - Deployment and Performance**

### Expert Path
14. Design with **13 - System Design Patterns**
15. Prepare with **14 - Interview Mastery**

## 🚀 Quick Start

1. **Read the Introduction** sections to understand Spring Boot's strengths
2. **Set up a project** using the recommended layout
3. **Choose your database** based on requirements
4. **Build iteratively** following best practices
5. **Test thoroughly** before deploying
6. **Monitor and optimize** in production

## 📖 How to Use This Knowledge Base

- **Reference**: Use as a reference guide when implementing features
- **Learning**: Read sequentially for comprehensive understanding
- **Problem Solving**: Jump to specific topics when facing challenges
- **Interview Prep**: Review system design patterns and interview mastery sections

## 🔧 Prerequisites

- Java 17+ knowledge
- Spring Framework basics
- REST API concepts
- Database fundamentals
- Maven/Gradle build tools

## 🎓 Key Topics Covered

- **Spring Boot Framework**: Core concepts, dependency injection, auto-configuration
- **Data Access**: JPA, Hibernate, Spring Data, MongoDB
- **Security**: Spring Security, JWT, OAuth2
- **Testing**: JUnit, Mockito, Testcontainers
- **Performance**: Caching, connection pooling, optimization
- **Microservices**: Patterns, distributed systems, event-driven architecture
- **Production**: Monitoring, logging, deployment, scaling

## 📝 Contribution

This knowledge base is designed to be comprehensive and practical. Each topic includes:
- Clear explanations
- Code examples
- Best practices
- Common pitfalls
- Real-world scenarios

## 🏗️ Project Structure Example

```
spring-boot-app/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── example/
│   │   │           ├── Application.java
│   │   │           ├── controller/
│   │   │           ├── service/
│   │   │           ├── repository/
│   │   │           ├── model/
│   │   │           └── config/
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/
│   └── test/
│       └── java/
├── pom.xml or build.gradle
└── README.md
```

## 🔗 Related Resources

- [Spring Boot Official Documentation](https://spring.io/projects/spring-boot)
- [Spring Framework Reference](https://docs.spring.io/spring-framework/reference/)
- [Spring Data JPA Documentation](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)

---

**Happy Learning! 🚀**

