# Encrypting PII at Rest

## 1. The Requirement

GDPR, HIPAA, and CCPA require you to encrypt Personally Identifiable Information (PII) like SSNs, Credit Card Numbers, and Emails *at rest*.
If a hacker steals your DB dump, they should see garbage.

---

## 2. Approach 1: Database Level Encryption (TDE)

Transparent Data Encryption (TDE) is handled by Postgres/MySQL.
- **Pros**: Zero code changes.
- **Cons**: Protects against stolen hard drives, but NOT against a compromised Admin user or SQL Injection.

---

## 3. Approach 2: Application Level Encryption (JPA Converter)

Encrypt the data *before* it leaves the Java app.

### The Converter
```java
@Converter
public class AttributeEncryptor implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private final Key key; // Load from Vault/KMS

    @Override
    public String convertToDatabaseColumn(String attribute) {
        // Encrypt
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, key);
        return Base64.getEncoder().encodeToString(cipher.doFinal(attribute.getBytes()));
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        // Decrypt
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, key);
        return new String(cipher.doFinal(Base64.getDecoder().decode(dbData)));
    }
}
```

### Usage
```java
@Entity
public class User {
    
    @Convert(converter = AttributeEncryptor.class)
    private String ssn;
}
```

**Cons**: You cannot search/sort by this field (`WHERE ssn = ?` will fail unless you encrypt the query param too, which breaks partial matches).

---

## 4. Key Management (Vault)

**NEVER** store the encryption key in `application.properties`.
Use **HashiCorp Vault** or **AWS KMS**.

Spring Cloud Vault:
```properties
spring.cloud.vault.host=localhost
spring.cloud.vault.port=8200
spring.cloud.vault.token=...
```
