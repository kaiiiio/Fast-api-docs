# Tuning Database Connection Pool (HikariCP)

## 1. The Default is Wrong

Spring Boot uses HikariCP. Default pool size is 10.
Is 10 enough? Is 100 better?

**Myth**: "More connections = Faster."
**Fact**: CPU cores are limited. If you have 4 cores, 100 connections just wait in line (Context Switching).

---

## 2. The Formula

PostgreSQL recommends:
`Pool Size = ((Core Count * 2) + Effective Spindle Count)`

For a 4-Core CPU: `(4 * 2) + 1 = 9`.
So **10** is actually a great default for small servers!

---

## 3. Configuration

```properties
# Maximum connections
spring.datasource.hikari.maximum-pool-size=20

# Minimum idle connections (Keep them ready)
spring.datasource.hikari.minimum-idle=10

# Timeout (If all 20 are busy, wait 30s then throw Exception)
spring.datasource.hikari.connection-timeout=30000

# Max Lifetime (Restart connection every 30 mins to prevent memory leaks)
spring.datasource.hikari.max-lifetime=1800000
```

---

## 4. Monitoring

Enable Hikari Metrics.

```properties
spring.datasource.hikari.register-mbeans=true
```

Check `hikaricp.connections.active` in Prometheus.
- If it's always hitting `maximum-pool-size`, increase it (if CPU allows).
- If it's always low, decrease it to save RAM.
