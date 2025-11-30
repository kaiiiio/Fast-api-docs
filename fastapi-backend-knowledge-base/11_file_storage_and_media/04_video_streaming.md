# 04. Video Streaming: Range Requests and HLS

## 1. The "Download" vs "Stream" Difference

- **Download**: Browser downloads the *entire* 1GB file before playing. (Terrible UX).
- **Stream**: Browser requests "Bytes 0-1000". Plays it. Requests "Bytes 1001-2000".

To support streaming, your server must handle the `Range` header.

---

## 2. FastAPI `StreamingResponse`

FastAPI supports this, but implementing `Range` support manually is hard.
However, if you just want to stream a generator:

```python
from fastapi.responses import StreamingResponse

def iterfile():
    with open("large_video.mp4", mode="rb") as file_like:
        yield from file_like

@app.get("/video")
async def main():
    return StreamingResponse(iterfile(), media_type="video/mp4")
```

**Warning**: This does NOT support seeking (jumping to 50%). For seeking, you need `Range` support.

---

## 3. The Real Solution: Nginx or S3

**Do not stream video through Python.** Python is slow at shuffling bytes.
Let Nginx or S3 do it.

### S3 (Best)
S3 supports `Range` requests out of the box.
1.  Upload video to S3.
2.  Give the S3 URL to the frontend `<video src="https://s3.../video.mp4">`.
3.  Browser handles the Range headers automatically.

### Nginx (Self-Hosted)
Nginx `mp4` module handles seeking efficiently.
```nginx
location /videos/ {
    mp4;
    mp4_buffer_size 1m;
    mp4_max_buffer_size 5m;
}
```

---

## 4. Adaptive Bitrate Streaming (HLS / DASH)

Serving a 4K video to a mobile user on 3G is bad.
You want **Adaptive Streaming**:
- User has fast internet -> Serve 1080p.
- User has slow internet -> Switch to 480p automatically.

**HLS (HTTP Live Streaming)** is the standard.
It breaks the video into 10-second chunks (`.ts` files) and a manifest (`.m3u8`).

### The Workflow
1.  User uploads `video.mp4`.
2.  Background Worker (FFmpeg) converts it:
    ```bash
    ffmpeg -i video.mp4 -profile:v baseline -level 3.0 -s 640x360 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls video_360p.m3u8
    ```
3.  Upload all `.ts` chunks and `.m3u8` files to S3.
4.  Frontend uses a player (Video.js) to play the `.m3u8`.

This is how Netflix/YouTube works.
