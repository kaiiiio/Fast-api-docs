# S3 Integration: Cloud File Storage in Express.js

AWS S3 provides scalable cloud file storage. This guide covers integrating S3 for file uploads and storage in Express.js applications.

## Installation

```bash
npm install @aws-sdk/client-s3 multer multer-s3
```

## Basic Setup

```javascript
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

// S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Multer S3 storage
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'public-read',
        key: (req, file, cb) => {
            const fileName = `${Date.now()}-${file.originalname}`;
            cb(null, `uploads/${fileName}`);
        }
    })
});
```

## Real-World Examples

### Example 1: File Upload

```javascript
// Single file upload
app.post('/upload', upload.single('file'), async (req, res) => {
    const fileUrl = req.file.location;
    res.json({ url: fileUrl });
});

// Multiple files
app.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
    const urls = req.files.map(file => file.location);
    res.json({ urls });
});
```

### Example 2: Presigned URLs

```javascript
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Generate presigned URL for upload
app.get('/upload-url', async (req, res) => {
    const { fileName, fileType } = req.query;
    
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `uploads/${fileName}`,
        ContentType: fileType
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.json({ url });
});

// Generate presigned URL for download
app.get('/download-url/:key', async (req, res) => {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: req.params.key
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.json({ url });
});
```

## Best Practices

1. **Use Presigned URLs**: For direct client uploads
2. **Validate Files**: Check type and size
3. **Set ACLs**: Configure access permissions
4. **Use CDN**: CloudFront for faster delivery
5. **Monitor Costs**: Track storage and transfer

## Summary

**S3 Integration:**

1. **Purpose**: Cloud file storage
2. **Features**: Upload, download, presigned URLs
3. **Best Practice**: Validate files, use presigned URLs
4. **Benefits**: Scalable, reliable storage
5. **Use Cases**: User uploads, media storage

**Key Takeaway:**
S3 integration provides scalable cloud file storage. Use multer-s3 for Express.js integration. Generate presigned URLs for direct client uploads. Validate file types and sizes. Configure ACLs appropriately. Use CloudFront CDN for faster delivery.

**S3 Strategy:**
- Use presigned URLs
- Validate files
- Set ACLs
- Use CDN
- Monitor costs

**Next Steps:**
- Learn [File Handling](01_file_handling_mastery.md) for uploads
- Study [Image Processing](../11_file_storage_and_media/image_processing.md) for optimization
- Master [Security](../11_file_storage_and_media/file_security.md) for protection

