# GDPR Compliance Design

## 1. The Right to be Forgotten

User says: "Delete all my data."
You must delete it from:
1.  Primary DB (Postgres)
2.  Analytics DB (Snowflake)
3.  Logs (Splunk)
4.  Backups (S3)

---

## 2. Architecture for Deletion

### The "Crypto-Shredding" Technique
Deleting from Backups is impossible (they are immutable).
**Solution**: Encrypt each user's PII with a *unique* key.
Store keys in a separate Key Management System (KMS).

**To "Delete" the user**:
Just delete their **Key**.
Now their data in Backups is permanent garbage that can never be decrypted.

---

## 3. Data Anonymization

Instead of deleting, you might want to keep stats ("We had a user from NY").
**Anonymize** the PII.

```java
public void anonymizeUser(Long userId) {
    User user = repository.findById(userId);
    user.setName("Deleted User");
    user.setEmail("deleted-" + UUID.randomUUID() + "@example.com");
    user.setAddress(null);
    repository.save(user);
}
```

---

## 4. Consent Management

You must track *what* the user consented to.

**Table: `user_consents`**
| user_id | consent_type | granted | timestamp |
|---|---|---|---|
| 1 | MARKETING_EMAIL | true | 2023-01-01 |
| 1 | DATA_SHARING | false | 2023-01-01 |

Check this before sending emails!
