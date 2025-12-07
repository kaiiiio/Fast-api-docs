# 01. File Handling Mastery: Uploads, Downloads, and Security

## 1. Receiving Files: `UploadFile` vs `bytes`

FastAPI gives you two ways to receive files.

### The "Quick & Dirty" Way: `bytes`

Reads the *entire* file into memory. **Pros:** Simple. **Cons:** Will crash your server if someone uploads a 5GB video.

### The "Professional" Way: `UploadFile`

Uses Python's `SpooledTemporaryFile`. It keeps small files in memory but writes large files to disk automatically. **Pros:** Safe, efficient, exposes metadata (filename, content_type).

```python
from fastapi import FastAPI, UploadFile, File

app = FastAPI()

# UploadFile: Professional way to handle file uploads (handles large files safely).
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # file.file is a file-like object: Can be read in chunks.
    contents = await file.read()  # Read entire file (use streaming for large files)
    
    return {
        "filename": file.filename,  # Original filename
        "content_type": file.content_type,  # MIME type
        "size": len(contents)  # File size in bytes
    }
```

---

## 2. Streaming Uploads (Saving to Disk)

Don't read the whole file into RAM (`await file.read()`) if you are just saving it to disk. Stream it chunk by chunk.

```python
import shutil
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Streaming upload: Saves file to disk without loading into memory.
@app.post("/save-file")
async def save_file(file: UploadFile = File(...)):
    destination = UPLOAD_DIR / file.filename
    
    # DANGER: See Security Section below about file.filename! (Path traversal risk)
    
    # shutil.copyfileobj: Streams file chunk by chunk (memory efficient).
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"path": str(destination)}
```

---

## 3. Security: The "Zip Slip" & Path Traversal

**NEVER TRUST USER INPUT**, especially filenames. If a hacker uploads a file named `../../../../windows/system32/hack.exe`, and you blindly join it with your upload dir, you might overwrite critical system files. This is called "Path Traversal" or "Zip Slip" attack.

### The Fix: Sanitize Filenames
Always generate your own safe filename (e.g., UUID) or strictly sanitize the input.

```python
import uuid

# Safe upload: Generate UUID filename to prevent path traversal attacks.
@app.post("/safe-upload")
async def safe_upload(file: UploadFile = File(...)):
    # Ignore the user's filename: Generate UUID to prevent path traversal.
    extension = file.filename.split(".")[-1]  # Extract extension
    new_filename = f"{uuid.uuid4()}.{extension}"  # UUID prevents attacks
    
    destination = UPLOAD_DIR / new_filename
    
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"id": new_filename}
```

---

## 4. Serving Files (Downloads)

FastAPI provides `FileResponse` and `StreamingResponse`.

### `FileResponse`
Best for files that exist on disk. It handles `Content-Type`, `Content-Length`, and `Last-Modified` headers automatically.

```python
from fastapi.responses import FileResponse

# FileResponse: Serves files from disk (handles headers automatically).
@app.get("/download/{file_id}")
async def download_file(file_id: str):
    file_path = UPLOAD_DIR / file_id
    if not file_path.exists():
        return {"error": "File not found"}
        
    # FileResponse: Automatically sets Content-Type, Content-Length, etc.
    return FileResponse(path=file_path, filename=f"download_{file_id}")
```

### `StreamingResponse`
Best for:
- Large files (videos).
- Files generated on-the-fly (CSV exports).
- Proxying files from S3 without saving to local disk.

```python
from fastapi.responses import StreamingResponse
import io

# StreamingResponse: Streams data as it's generated (memory efficient for large files).
@app.get("/generate-csv")
async def generate_csv():
    # Generator function: Yields chunks of data (doesn't load all in memory).
    def iter_csv():
        yield "id,name,email\n"
        for i in range(1000):
            yield f"{i},User{i},user{i}@example.com\n"
            
    # StreamingResponse: Sends data as it's generated, not all at once.
    return StreamingResponse(iter_csv(), media_type="text/csv")
```

---

## 5. Inductive Example: A Secure File Server

We want a system where:
1.  Users upload images.
2.  We validate they are *actually* images (Magic Numbers).
3.  We save them safely.

```python
import filetype # pip install filetype

# Secure image upload: Validates file type using magic numbers (file signature).
@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # 1. Read first 2KB to check file signature: Validates actual file type, not just extension.
    head = await file.read(2048)
    kind = filetype.guess(head)  # Checks magic numbers (file signature)
    
    if kind is None or not kind.mime.startswith("image/"):
        return {"error": "Invalid image type"}  # Reject non-images
        
    # Reset cursor to start: Rewind file to beginning for saving.
    await file.seek(0)
    
    # 2. Save safely: Use UUID filename + validated extension.
    filename = f"{uuid.uuid4()}.{kind.extension}"
    path = UPLOAD_DIR / filename
    
    with path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/static/{filename}"}

---

## 🎯 Interview Questions: FastAPI

### Q1: Explain file handling in FastAPI, including file uploads, downloads, streaming, security considerations, and best practices. Provide detailed examples showing secure file handling.

**Answer:**

**File Handling Overview:**

FastAPI provides two ways to handle file uploads: `bytes` for simple cases and `UploadFile` for production use. Understanding the differences and security implications is crucial.

**UploadFile vs bytes:**

**bytes (Simple but Limited):**
```python
# ❌ Bad: Loads entire file into memory
@app.post("/upload")
async def upload_file(file: bytes = File(...)):
    # Entire file in memory - crashes with large files
    return {"size": len(file)}
# Problem: Memory issues with large files
```

**UploadFile (Production-Ready):**
```python
# ✅ Good: Handles large files safely
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Uses SpooledTemporaryFile
    # Small files in memory, large files on disk
    contents = await file.read()
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(contents)
    }
# Benefit: Safe, efficient, exposes metadata
```

**Streaming Uploads:**
```python
import shutil
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/save-file")
async def save_file(file: UploadFile = File(...)):
    """Stream file to disk without loading into memory."""
    destination = UPLOAD_DIR / file.filename
    
    # Stream file chunk by chunk (memory efficient)
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"path": str(destination)}
```

**Security: Path Traversal Prevention:**
```python
import uuid

@app.post("/safe-upload")
async def safe_upload(file: UploadFile = File(...)):
    """Secure upload with UUID filename."""
    # ❌ Bad: Trust user filename
    # destination = UPLOAD_DIR / file.filename  # Path traversal risk!
    
    # ✅ Good: Generate safe filename
    extension = file.filename.split(".")[-1]
    new_filename = f"{uuid.uuid4()}.{extension}"  # UUID prevents attacks
    
    destination = UPLOAD_DIR / new_filename
    
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"id": new_filename}
```

**File Type Validation:**
```python
import filetype

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Secure image upload with validation."""
    # 1. Read first 2KB to check file signature
    head = await file.read(2048)
    kind = filetype.guess(head)  # Checks magic numbers
    
    if kind is None or not kind.mime.startswith("image/"):
        raise HTTPException(400, "Invalid image type")
    
    # 2. Reset cursor
    await file.seek(0)
    
    # 3. Save safely
    filename = f"{uuid.uuid4()}.{kind.extension}"
    path = UPLOAD_DIR / filename
    
    with path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/static/{filename}"}
```

**File Downloads:**
```python
from fastapi.responses import FileResponse, StreamingResponse

# FileResponse: For files on disk
@app.get("/download/{file_id}")
async def download_file(file_id: str):
    file_path = UPLOAD_DIR / file_id
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    
    return FileResponse(
        path=file_path,
        filename=f"download_{file_id}",
        media_type="application/octet-stream"
    )

# StreamingResponse: For large files or generated content
@app.get("/generate-csv")
async def generate_csv():
    def iter_csv():
        yield "id,name,email\n"
        for i in range(1000):
            yield f"{i},User{i},user{i}@example.com\n"
    
    return StreamingResponse(iter_csv(), media_type="text/csv")
```

**Best Practices:**

**1. Validate File Types:**
```python
# Use magic numbers, not extensions
# Check file signatures
# Validate MIME types
```

**2. Sanitize Filenames:**
```python
# Generate UUID filenames
# Never trust user input
# Prevent path traversal
```

**3. Stream Large Files:**
```python
# Don't load entire file into memory
# Use streaming for large files
# Chunk-based processing
```

**System Design Consideration**: File handling requires:
1. **Security**: Path traversal prevention
2. **Performance**: Streaming for large files
3. **Validation**: File type checking
4. **Storage**: Efficient file management

File handling is essential for many applications. Understanding uploads, downloads, streaming, and security is crucial for building secure, efficient file handling systems.

---

### Q2: Explain file validation strategies, handling large files, security best practices, and when to use FileResponse vs StreamingResponse. Discuss performance optimization and common security pitfalls.

**Answer:**

**File Validation:**
```python
# Use magic numbers (file signatures)
# Validate MIME types
# Check file size limits
# Verify file extensions
```

**Large File Handling:**
```python
# Stream files, don't load into memory
# Use chunk-based processing
# Implement resumable uploads
```

**Security Best Practices:**
```python
# Generate UUID filenames
# Validate file types
# Limit file sizes
# Sanitize paths
# Use secure storage
```

**FileResponse vs StreamingResponse:**
```python
# FileResponse: Files on disk
# StreamingResponse: Generated content or large files
```

**System Design Consideration**: File handling security requires:
1. **Validation**: File type and size
2. **Sanitization**: Filename and path
3. **Storage**: Secure file storage
4. **Access Control**: Proper permissions

Understanding file validation, large file handling, and security is essential for building secure file handling systems.

```
