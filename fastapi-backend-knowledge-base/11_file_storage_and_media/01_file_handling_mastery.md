# File Handling (FastAPI): Minimal Guide

## Core Pattern
*   **`UploadFile`:** Preferred over `File` (bytes) because it stays in Python's memory (spools to disk) for large files.
*   **Async Saving:** Use **`aiofiles`** to ensure file saving is non-blocking.

## Implementation Example
```python
from fastapi import UploadFile
import aiofiles

@app.post("/upload/")
async def upload_file(file: UploadFile):
    # aiofiles.open ensures thread-safe, async save
    async with aiofiles.open(f"uploads/{file.filename}", 'wb') as f:
        content = await file.read() # Read content
        await f.write(content) # Write content
    return {"filename": file.filename}
```

## Large Files
- **Streaming:** Use `StreamingResponse` for large downloads.
- **Generator:** Stream file in chunks to avoid memory spikes.

## Best Practices
- ✅ Always use **`UploadFile`** for better memory management.
- ✅ Validate **`content_type`** (e.g., `image/jpeg`) before saving.
- ✅ Limit **`size`** via middleware or manual check (prevent server overflow).
- ✅ Store files in **Blob Storage** (S3/GCS); avoid local disk for production apps.

## Summary Checklist
- ✅ `UploadFile` type used
- ✅ `aiofiles` for saving
- ✅ MIME-type validation
- ✅ Max-size limit configured