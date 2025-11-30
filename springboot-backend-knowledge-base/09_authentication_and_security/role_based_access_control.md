# Role-Based Access Control (RBAC) in Spring Boot

## 1. The Model

In `UserDetails`, you have `getAuthorities()`.

```java
public class User implements UserDetails {
    
    @Enumerated(EnumType.STRING)
    private Role role; // ADMIN, USER, MANAGER

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
```

---

## 2. Method Security (`@PreAuthorize`)

The easiest way to secure endpoints.

### Enable it
```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig { ... }
```

### Use it
```java
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public String getAdminData() {
        return "Admin access only";
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('admin:delete')")
    public void deleteUser(@PathVariable Integer id) {
        service.delete(id);
    }
}
```

---

## 3. Hierarchy

Sometimes `ADMIN` should imply `USER`.

```java
@Bean
public RoleHierarchy roleHierarchy() {
    RoleHierarchyImpl roleHierarchy = new RoleHierarchyImpl();
    String hierarchy = "ROLE_ADMIN > ROLE_MANAGER \n ROLE_MANAGER > ROLE_USER";
    roleHierarchy.setHierarchy(hierarchy);
    return roleHierarchy;
}
```

Now if you have `ROLE_ADMIN`, you automatically pass checks for `hasRole('USER')`.
