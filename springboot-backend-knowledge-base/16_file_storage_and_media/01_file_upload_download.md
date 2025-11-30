# File Upload and Download Mastery

## 1. The Basics (`MultipartFile`)

Spring Boot handles file uploads via the Servlet API.

```java
@PostMapping("/upload")
public ResponseEntity<String> upload(@RequestParam("file") MultipartFile file) {
    if (file.isEmpty()) {
        return ResponseEntity.badRequest().body("Empty file");
    }
    
    String filename = StringUtils.cleanPath(file.getOriginalFilename());
    // Save to disk...
    return ResponseEntity.ok("Uploaded: " + filename);
}
```

---

## 2. Configuration (Limits)

By default, Spring limits uploads to 1MB.
Increase it in `application.properties`:

```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

---

## 3. Streaming Downloads

Don't load the whole file into RAM (`byte[]`).
Use `Resource` and `InputStreamResource`.

```java
@GetMapping("/download/{filename}")
public ResponseEntity<Resource> download(@PathVariable String filename) throws IOException {
    Path path = Paths.get("uploads/" + filename);
    Resource resource = new UrlResource(path.toUri());
    
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
        .body(resource);
}
```

---

## 4. Large File Uploads (Streaming)

For 1GB+ files, `MultipartFile` (which might buffer to disk/tmp) is okay, but for *extreme* performance, use `HttpServletRequest` streaming.
(Advanced: See `StandardServletMultipartResolver`).
