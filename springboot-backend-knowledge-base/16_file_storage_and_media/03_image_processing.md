# Image Processing (Thumbnailator)

## 1. The Problem

Users upload 10MB 4K images for their avatar.
You display them at 50x50px.
You are wasting bandwidth and slowing down the page.

**Solution**: Resize on upload.

---

## 2. Thumbnailator

The best Java library for this.

```xml
<dependency>
    <groupId>net.coobird</groupId>
    <artifactId>thumbnailator</artifactId>
    <version>0.4.20</version>
</dependency>
```

---

## 3. Resizing

```java
public void processImage(InputStream input, OutputStream output) throws IOException {
    Thumbnails.of(input)
        .size(200, 200)
        .outputFormat("jpg")
        .outputQuality(0.8)
        .toOutputStream(output);
}
```

---

## 4. Async Processing

Image processing is CPU intensive. **Do not do it in the Controller thread**.
Use `@Async` or a Message Queue.

```java
@Async
public void processAndUpload(MultipartFile file) {
    // 1. Resize
    ByteArrayOutputStream os = new ByteArrayOutputStream();
    processImage(file.getInputStream(), os);
    
    // 2. Upload to S3
    s3Service.upload("avatars/" + file.getOriginalFilename(), 
                     new ByteArrayInputStream(os.toByteArray()));
}
```
