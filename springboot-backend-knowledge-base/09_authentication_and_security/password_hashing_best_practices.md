# Password Hashing Best Practices

## 1. Never Roll Your Own Crypto

Do not use `MD5` or `SHA-256` directly. They are too fast. Hackers can brute-force them.
Use **BCrypt**, **SCrypt**, or **Argon2**.

---

## 2. Spring Security Defaults

Spring Security provides `BCryptPasswordEncoder` out of the box. It is the industry standard.

```java
@Configuration
public class ApplicationConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### Usage
```java
@Service
public class AuthenticationService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository repository;

    public void register(RegisterRequest request) {
        var user = User.builder()
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword())) // Hash it!
            .role(Role.USER)
            .build();
        repository.save(user);
    }
    
    public void authenticate(AuthRequest request) {
        // AuthenticationManager uses PasswordEncoder.matches() internally
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
    }
}
```

---

## 3. Tuning BCrypt

BCrypt has a "strength" parameter (log rounds). Default is 10.
Increasing it by 1 doubles the time it takes to hash.

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12); // Slower, more secure
}
```

**Goal**: Hashing should take ~500ms on your server.
- Too fast? Increase strength.
- Too slow? Decrease strength (but never below 10).
