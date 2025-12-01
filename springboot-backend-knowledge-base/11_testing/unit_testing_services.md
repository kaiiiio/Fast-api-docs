# Unit Testing Services in Spring Boot

## 1. JUnit 5 and Mockito

Spring Boot Starter Test includes JUnit 5, Mockito, and AssertJ.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 2. Testing a Service (Isolated)

Do NOT use `@SpringBootTest` for unit tests. It's too slow (starts the whole context).
Use `@ExtendWith(MockitoExtension.class)`.

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldCreateUser() {
        // Given
        User user = new User("Alice", "alice@example.com");
        when(userRepository.save(any(User.class))).thenReturn(user);

        // When
        User created = userService.createUser(user);

        // Then
        assertThat(created.getName()).isEqualTo("Alice");
        verify(userRepository).save(any(User.class));
    }
}
```

**Key Annotations**:
- `@Mock`: Creates a fake object.
- `@InjectMocks`: Injects the mocks into the real object (`userService`).
- `@Test`: Marks a method as a test.

---

## 3. Testing Controllers (`@WebMvcTest`)

Tests only the Controller layer. Mocks the Service layer.

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void shouldReturnUser() throws Exception {
        when(userService.getUser(1L)).thenReturn(new User("Alice"));

        mockMvc.perform(get("/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice"));
    }
}
```
