# JUnit Fixtures and Setup

## 1. `@BeforeEach` vs `@BeforeAll`

- **`@BeforeEach`**: Runs before *every* test method. Use to reset state (e.g., clear DB).
- **`@BeforeAll`**: Runs *once* before the class. Use to start expensive resources (Testcontainers). Must be `static`.

```java
class UserServiceTest {

    @BeforeAll
    static void init() {
        System.out.println("Starting Database...");
    }

    @BeforeEach
    void setup() {
        System.out.println("Clearing tables...");
    }
}
```

---

## 2. Test Data Builders

Don't use `new User("Alice", "Smith", 30, "NY", ...)` in every test.
Use the **Builder Pattern** for test data.

```java
public class UserTestData {
    
    public static User.UserBuilder defaultUser() {
        return User.builder()
            .id(1L)
            .name("Alice")
            .email("alice@example.com");
    }
}
```

**Usage**:
```java
@Test
void shouldUpdateUser() {
    User user = UserTestData.defaultUser().name("Bob").build();
    service.update(user);
}
```

---

## 3. Parameterized Tests

Don't write 5 tests for "Email Validation". Write 1 parameterized test.

```java
@ParameterizedTest
@ValueSource(strings = {"bad-email", "no-at-sign.com", "@domain.com"})
void shouldRejectInvalidEmails(String email) {
    assertThrows(ValidationException.class, () -> service.register(email));
}
```

Also supports `@CsvSource` for multiple arguments.
```java
@ParameterizedTest
@CsvSource({
    "1, 1, 2",
    "2, 3, 5",
    "10, 20, 30"
})
void shouldAddNumbers(int a, int b, int expected) {
    assertEquals(expected, calculator.add(a, b));
}
```
