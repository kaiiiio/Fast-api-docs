# Video Streaming (Range Requests)

## 1. How Video Streaming Works

Browser doesn't download the whole 1GB movie.
It asks: "Give me bytes 0-1000".
Then: "Give me bytes 1001-2000".

This is the **HTTP Range Header**.
`Range: bytes=0-1023`

---

## 2. Spring Boot Implementation

Spring MVC supports `ResourceRegion` for partial content.

```java
@GetMapping("/video/{name}")
public ResponseEntity<ResourceRegion> streamVideo(@PathVariable String name, 
                                                  @RequestHeader HttpHeaders headers) throws IOException {
    
    UrlResource video = new UrlResource("file:videos/" + name);
    ResourceRegion region = resourceRegion(video, headers);
    
    return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT) // 206
        .contentType(MediaTypeFactory.getMediaType(video).orElse(MediaType.APPLICATION_OCTET_STREAM))
        .body(region);
}

private ResourceRegion resourceRegion(Resource video, HttpHeaders headers) throws IOException {
    long contentLength = video.contentLength();
    List<HttpRange> ranges = headers.getRange();
    
    if (ranges.isEmpty()) {
        return new ResourceRegion(video, 0, Math.min(1024 * 1024, contentLength)); // Default 1MB chunk
    }
    
    HttpRange range = ranges.get(0);
    long start = range.getRangeStart(contentLength);
    long end = range.getRangeEnd(contentLength);
    long rangeLength = Math.min(1024 * 1024, end - start + 1); // Limit chunk size
    
    return new ResourceRegion(video, start, rangeLength);
}
```

---

## 3. HLS (HTTP Live Streaming)

For professional streaming (Netflix style), don't use Range Requests on a single MP4.
Use **HLS (.m3u8)**.
1.  Split video into 10s chunks (`.ts` files).
2.  Serve the `.m3u8` playlist.
3.  Browser downloads chunks adaptively.

Use **FFmpeg** to generate HLS.
`ffmpeg -i input.mp4 -hls_time 10 -hls_list_size 0 output.m3u8`
