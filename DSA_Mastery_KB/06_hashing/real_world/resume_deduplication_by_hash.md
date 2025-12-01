# 🌍 Real World: Resume Deduplication

**Scenario**: Candidates apply 10 times to the same job.
Parsing a PDF is expensive (OCR, AI).
We want to skip parsing if we've seen this file before.

## The Solution: Content Hashing
1.  Read the file bytes.
2.  Compute SHA-256 Hash. `Hash(FileBytes) -> "a1b2c3..."`
3.  Check DB: `SELECT * FROM resumes WHERE file_hash = "a1b2c3..."`

## Why Hash?
*   **Speed**: Comparing 32-byte hashes is instant. Comparing 5MB files is slow.
*   **Privacy**: You can store the hash without storing the file (if needed).

## Code
```python
import hashlib

def get_file_hash(file_path):
    hasher = hashlib.sha256()
    with open(file_path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()
```
