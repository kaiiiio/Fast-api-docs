# File Storage & Media Processing in Node.js

Managing file uploads and cloud storage is a core requirement for modern backend systems. This guide covers local storage, S3 integration, and media processing.

## 1. File Uploads (Multer)
Node.js doesn't natively parse multipart/form-data. **Multer** is the standard middleware for handling file uploads.

### Basic Setup
```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/profile', upload.single('avatar'), (req, res) => {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if any
});
```

### Advanced Disk Storage
Control the filename and destination path.
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/my-uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({ storage: storage });
```

---

## 2. Cloud Storage (AWS S3)
For production, avoid storing files on the application server (stateless architecture). Use AWS S3 or compatible services.

### S3 Upload Pattern (v3 SDK)
```javascript
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({ region: "us-east-1" });

async function uploadToS3(fileBuffer, fileName) {
  const params = {
    Bucket: "my-bucket-name",
    Key: `uploads/${fileName}`,
    Body: fileBuffer,
    ContentType: "image/jpeg"
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(params));
    return data;
  } catch (err) {
    console.error("Error", err);
  }
}
```

---

## 3. Media Processing (Sharp)
**Sharp** is the fastest Node.js module for resizing and converting images.

### Resizing and WebP Conversion
```javascript
const sharp = require('sharp');

async function processImage(inputBuffer) {
  return await sharp(inputBuffer)
    .resize(800, 600)
    .toFormat('webp')
    .toBuffer();
}
```

---

## 4. Best Practices
1. **Statelessness**: Never store user uploads on the same server running your code. Use S3/GCS.
2. **Streaming**: For large files, stream directly from the request to S3 to save memory.
3. **Presigned URLs**: Users should upload directly to S3 using Presigned URLs to bypass your server entirely (saves bandwidth).
4. **Validation**: Always validate file size and MIME type on the server.
5. **Security**: Sanitize filenames to prevent path traversal attacks.
