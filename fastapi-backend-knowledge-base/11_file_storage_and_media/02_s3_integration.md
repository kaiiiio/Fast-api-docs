# 02. S3 Integration: Infinite Storage

## 1. Why S3?

Storing files on the local disk (`/uploads`) is fine for prototypes.
For production, it is a disaster:
1.  **Scalability**: If you add a second server, it can't see files on the first server.
2.  **Reliability**: If the disk dies, data is gone.
3.  **Performance**: Serving large files consumes your API's CPU and RAM.

**S3 (Simple Storage Service)** solves this. It is an object store. You upload a file, get a URL, and forget about it.

---

## 2. Setting Up `boto3`

`boto3` is the standard AWS SDK for Python.

```bash
pip install boto3
```

### Configuration
Never hardcode credentials. Use Environment Variables.

```python
import os
import boto3
from botocore.exceptions import NoCredentialsError

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)
```

---

## 3. Uploading Files

The naive way is to receive the file in FastAPI, then upload to S3.

```python
from fastapi import UploadFile, HTTPException

async def upload_to_s3(file: UploadFile, filename: str):
    try:
        # file.file is a SpooledTemporaryFile (file-like object)
        s3_client.upload_fileobj(
            file.file,
            AWS_BUCKET_NAME,
            filename,
            ExtraArgs={"ContentType": file.content_type}
        )
        return f"https://{AWS_BUCKET_NAME}.s3.amazonaws.com/{filename}"
    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS Credentials missing")
```

**Pros**: Simple. You can validate the file content before uploading.
**Cons**: Your server is the bottleneck. If a user uploads a 1GB video, your server holds that connection open for the entire duration.

---

## 4. The Pro Way: Presigned URLs

Don't let users upload to *you*. Let them upload directly to *S3*.

1.  Client asks API: "I want to upload `cat.jpg`".
2.  API asks S3: "Give me a temporary URL for `cat.jpg`".
3.  S3 returns a **Presigned URL**.
4.  API gives URL to Client.
5.  Client performs `PUT` request to that URL.

**Your server handles 0 bytes of the file.**

### Generating the URL

```python
def generate_presigned_url(filename: str, file_type: str):
    try:
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': AWS_BUCKET_NAME,
                'Key': filename,
                'ContentType': file_type
            },
            ExpiresIn=3600  # URL valid for 1 hour
        )
        return url
    except Exception as e:
        print(e)
        return None
```

### The Endpoint

```python
from pydantic import BaseModel

class FileUploadRequest(BaseModel):
    filename: str
    content_type: str

@app.post("/generate-upload-url")
async def get_upload_url(request: FileUploadRequest):
    # 1. Validate (e.g., ensure user is allowed to upload)
    
    # 2. Generate unique filename (prevent overwrites)
    unique_filename = f"uploads/{uuid.uuid4()}/{request.filename}"
    
    # 3. Get URL
    url = generate_presigned_url(unique_filename, request.content_type)
    
    return {"upload_url": url, "file_path": unique_filename}
```

---

## 5. Serving Private Files

If your bucket is **Public**, anyone can read the files.
If your bucket is **Private** (e.g., invoices, medical records), you need Presigned **Get** URLs.

```python
url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': AWS_BUCKET_NAME, 'Key': 'private/invoice.pdf'},
    ExpiresIn=600  # Valid for 10 minutes
)
```

Redirect the user to this URL.
