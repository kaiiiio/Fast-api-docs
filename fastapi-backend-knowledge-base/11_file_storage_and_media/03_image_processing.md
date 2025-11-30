# 03. Image Processing: Resizing and Optimization

## 1. The Problem with Raw Uploads

Users upload 4K images (5MB+) for their profile pictures.
If you serve these directly:
1.  **Bandwidth Costs**: You pay for 5MB every time someone views the profile.
2.  **Slow UI**: The browser takes seconds to download and render it.
3.  **Storage Costs**: You store unnecessary pixels.

You MUST resize and optimize images before storage.

---

## 2. The Tool: Pillow (`PIL`)

`Pillow` is the standard image library for Python.

```bash
pip install Pillow
```

### Basic Resizing

```python
from PIL import Image
import io

def resize_image(file_bytes: bytes, max_width: int = 800) -> bytes:
    # 1. Open image from bytes
    image = Image.open(io.BytesIO(file_bytes))
    
    # 2. Calculate new height to maintain aspect ratio
    width_percent = (max_width / float(image.size[0]))
    h_size = int((float(image.size[1]) * float(width_percent)))
    
    # 3. Resize (LANCZOS is best quality)
    image = image.resize((max_width, h_size), Image.Resampling.LANCZOS)
    
    # 4. Save to bytes
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()
```

---

## 3. FastAPI Integration

Do not block the main thread! Image processing is CPU intensive. Run it in a thread pool or a background worker (Celery).

### Synchronous (Blocking) - BAD for high load
```python
@app.post("/upload-profile")
async def upload_profile(file: UploadFile):
    content = await file.read()
    resized_content = resize_image(content) # BLOCKS EVENT LOOP
    # upload resized_content to S3...
```

### Asynchronous (Thread Pool) - GOOD
```python
import asyncio

@app.post("/upload-profile")
async def upload_profile(file: UploadFile):
    content = await file.read()
    
    # Run in thread pool
    loop = asyncio.get_event_loop()
    resized_content = await loop.run_in_executor(None, resize_image, content)
    
    # upload resized_content to S3...
```

---

## 4. Advanced: Generating Thumbnails

For a gallery, you often need multiple sizes:
- `original.jpg` (Backup)
- `large.jpg` (1080p for modal view)
- `thumb.jpg` (300px for grid view)

### The Worker Pattern
1.  User uploads `original.jpg` to S3 (via Presigned URL).
2.  S3 triggers a Lambda Function (or sends event to SQS).
3.  Worker downloads `original.jpg`.
4.  Worker generates `large.jpg` and `thumb.jpg`.
5.  Worker uploads them back to S3.

**Why?**
- **Zero Latency**: User upload finishes instantly.
- **Scalability**: Image processing happens asynchronously.

---

## 5. Security: The "Image Bomb"

A malicious user can upload a "Decompression Bomb" (a small file that expands to 100GB in RAM).

**Protection**:
Pillow has a built-in limit.
```python
Image.MAX_IMAGE_PIXELS = 100000000 # 100 Million pixels
```
Always validate the file header (Magic Bytes) to ensure it is actually an image, not an `.exe` renamed to `.jpg`.
