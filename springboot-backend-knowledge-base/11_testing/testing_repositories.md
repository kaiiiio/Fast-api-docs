# Testing Repositories (`@DataJpaTest`)

## 1. Why test Repositories?

"It's just an interface!"
Yes, but you need to test:
- Custom JPQL Queries (`@Query`).
- Native SQL Queries.
- Mapping logic (Enums, JSONB).

---

## 2. `@DataJpaTest`

This annotation:
1.  Configures an In-Memory DB (H2) *or* uses Testcontainers.
2.  Scans for `@Entity` and `@Repository`.
3.  **Ignores** `@Service`, `@Controller`, `@Component` (Fast!).
4.  **Rolls back** transactions after each test (Clean state).

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE) // Use Testcontainers, not H2
class UserRepositoryTest {

    @Autowired
    private UserRepository repository;

    @Test
    void shouldFindActiveUsers() {
        // Given
        User active = new User("Alice", true);
        User inactive = new User("Bob", false);
        repository.saveAll(List.of(active, inactive));

        // When
        List<User> result = repository.findByActiveTrue();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Alice");
    }
}
```

---

## 3. Testing Custom Queries

```java
@Query("SELECT u FROM User u WHERE u.email LIKE %:domain")
List<User> findByEmailDomain(@Param("domain") String domain);
```

Test it!
```java
@Test
void shouldFindByDomain() {
    repository.save(new User("alice@gmail.com"));
    repository.save(new User("bob@yahoo.com"));
    
    List<User> gmailUsers = repository.findByEmailDomain("gmail.com");
    
    assertThat(gmailUsers).hasSize(1);
}
```
