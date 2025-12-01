# Integration Testing with Testcontainers

## 1. Why Testcontainers?

H2 (In-Memory DB) behaves differently than PostgreSQL.
- H2 doesn't support JSONB.
- H2 doesn't support specific SQL syntax.

**Testcontainers** spins up a *real* Docker container for your database during tests.

---

## 2. Setup

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 3. The Base Test Class

Create a base class that starts the container once for all tests (faster).

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public abstract class BaseIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

---

## 4. Writing the Test

```java
class ProductIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ProductRepository repository;

    @Test
    void shouldSaveAndRetrieveProduct() {
        Product product = new Product("iPhone 15", 999.99);
        repository.save(product);

        Product found = repository.findByName("iPhone 15").orElseThrow();
        assertThat(found.getPrice()).isEqualTo(999.99);
    }
}
```

**Result**: You are testing against a REAL Postgres database. Zero mocking. 100% confidence.
