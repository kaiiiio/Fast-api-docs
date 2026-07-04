# AWS Storage Services: S3, EBS, and EFS

Understanding how to store and manage data in the AWS ecosystem.

## Key Terms

* **Object storage** (file-like storage): stores objects such as images, PDFs, backups.
* **Bucket** (S3 container): top-level place where S3 objects live.
* **Object** (file + metadata): actual item stored in S3.
* **Presigned URL** (temporary private link): lets user upload/download without making bucket public.
* **Storage class** (cost/access tier): Standard, IA, Glacier, Intelligent-Tiering.
* **Lifecycle policy** (automatic movement/deletion): moves old files to cheaper tiers.
* **Block storage** (virtual disk): EBS volume attached to EC2.
* **Snapshot** (point-in-time backup): backup of EBS volume.
* **File storage** (shared filesystem): EFS mounted by multiple servers.
* **IOPS** (disk operations/sec): storage performance measure.

---

## 1. Amazon S3 (Simple Storage Service)
**Object Storage:** The go-to service for user uploads, static sites, and backups.

### Core Concepts
- **Buckets:** Containers for objects (must have globally unique names).
- **Objects:** Files + Metadata.
- **Storage Classes:** 
  - **Standard:** Frequent access.
  - **Intelligent-Tiering:** Auto-moves data to save costs.
  - **Glacier:** Archive storage (very cheap, slow retrieval).

### Security
- **Block Public Access:** By default, buckets are private. **Keep them that way.**
- **Presigned URLs:** Generate temporary links (e.g., 1 hour) for users to view private files safely.
- **IAM Policies:** Granular control over who can Read/Write.

---

## 2. Amazon EBS (Elastic Block Store)
**Block Storage:** Virtual hard drives for your EC2 instances.

### Key Facts
- **Performance:** Low latency, high throughput.
- **Snapshots:** Point-in-time backups of your volumes.
- **Provisioned IOPS:** For heavy databases that need guaranteed speed.
- **Lifecycle:** Volumes persist even if the EC2 instance is stopped.

---

## 3. Amazon EFS (Elastic File System)
**File Storage:** Shared storage that can be mounted on multiple EC2 instances simultaneously.

### When to use?
- **Shared CMS:** Multiple web servers needing access to the same `/uploads` folder.
- **Data Sharing:** Parallel processing across multiple workers.
- **Scalability:** Grows and shrinks automatically as you add/remove files.

---

## Selection Guide
| Requirement | Recommended Service |
|-------------|---------------------|
| User profile pictures | **S3** |
| Database storage for EC2 | **EBS** |
| Shared config across servers| **EFS** |
| Static website hosting | **S3 + CloudFront** |
