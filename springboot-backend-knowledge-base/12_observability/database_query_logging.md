# Database Query Logging

## 1. Development Mode

To see SQL in console:

```properties
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

**Output**:
```sql
select user0_.id as id1_0_, user0_.name as name2_0_ from users user0_ where user0_.id=?
```
**Problem**: It prints `?` instead of values.

### Trace Parameters
```properties
logging.level.org.hibernate.type.descriptor.sql=TRACE
```
Now you see the values bound to the `?`.

---

## 2. Production Mode (Datasource Proxy)

Don't use `show-sql` in prod. It spams logs.
Use **Datasource Proxy** to log *slow* queries only.

```java
@Bean
public BeanPostProcessor dataSourceWrapper() {
    return new BeanPostProcessor() {
        @Override
        public Object postProcessAfterInitialization(Object bean, String beanName) {
            if (bean instanceof DataSource) {
                return ProxyDataSourceBuilder.create((DataSource) bean)
                    .logQueryBySlf4j(SLF4JLogLevel.INFO, "SlowQueryLogger")
                    .logSlowQueryBySlf4j(1000, TimeUnit.MILLISECONDS) // Log if > 1s
                    .build();
            }
            return bean;
        }
    };
}
```

Now you get logs like:
`Name:SlowQueryLogger, Time:1500ms, Query: SELECT * FROM users`
