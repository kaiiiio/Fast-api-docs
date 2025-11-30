# S3 Integration (AWS SDK v2)

## 1. Why S3?

Local disk storage doesn't scale.
- **Stateless**: Servers can die/restart without losing data.
- **CDN**: Serve files faster via CloudFront.

---

## 2. Setup

```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
</dependency>
```

```java
@Configuration
public class S3Config {
    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .region(Region.US_EAST_1)
            .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
            .build();
    }
}
```

---

## 3. Uploading (PutObject)

```java
public void uploadFile(String key, InputStream inputStream, long length) {
    PutObjectRequest request = PutObjectRequest.builder()
        .bucket("my-bucket")
        .key(key)
        .build();
        
    s3Client.putObject(request, RequestBody.fromInputStream(inputStream, length));
}
```

---

## 4. Presigned URLs (The Best Practice)

Don't proxy traffic through your server (Client -> Spring -> S3).
Let Client upload directly to S3 (Client -> S3).

```java
@Autowired
private S3Presigner presigner;

public String getUploadUrl(String key) {
    PutObjectPresignRequest request = PutObjectPresignRequest.builder()
        .signatureDuration(Duration.ofMinutes(10))
        .putObjectRequest(r -> r.bucket("my-bucket").key(key))
        .build();
        
    return presigner.presignPutObject(request).url().toString();
}
```

**Flow**:
1.  Client asks Spring for URL.
2.  Spring generates URL (valid for 10 mins).
3.  Client PUTs file to that URL.
