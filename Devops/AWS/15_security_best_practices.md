# AWS Security Best Practices for Backend Deployment

A comprehensive guide to securing your Node.js and FastAPI applications on AWS.

## Key Terms

* **IAM policy** (permission document): defines allowed/denied AWS actions.
* **IAM role** (temporary permissions): attached to EC2/Lambda/ECS instead of hardcoded keys.
* **Least privilege** (minimum required access): only grant what app/user needs.
* **MFA** (second login factor): protects accounts even if password leaks.
* **Security Group** (stateful firewall): controls instance/service traffic.
* **WAF** (web application firewall): blocks common web attacks.
* **Secrets Manager** (managed secret storage): stores/rotates DB passwords/API keys.
* **KMS** (key management service): manages encryption keys.
* **TLS/SSL** (encrypted network traffic): HTTPS and secure DB connections.
* **Rotation** (regular secret replacement): limits damage from leaked credentials.
* **CloudTrail** (audit history): records AWS API activity for investigations.

---

## Table of Contents
1. [IAM Security](#iam-security)
2. [EC2 Security](#ec2-security)
3. [Network Security](#network-security)
4. [Application Security](#application-security)
5. [Database Security](#database-security)
6. [Secrets Management](#secrets-management)
7. [Monitoring & Logging](#monitoring--logging)
8. [SSL/TLS Configuration](#ssltls-configuration)

---

## IAM Security

### Never Use Root Account
```bash
# ❌ BAD: Using root account for daily tasks
# Root account has unlimited access

# ✅ GOOD: Create IAM users
aws iam create-user --user-name developer
aws iam create-access-key --user-name developer

# Attach policies
aws iam attach-user-policy \
  --user-name developer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
```

### Use IAM Roles for EC2
```bash
# Create IAM role for EC2
aws iam create-role \
  --role-name EC2-S3-Access \
  --assume-role-policy-document file://trust-policy.json

# Attach policy
aws iam attach-role-policy \
  --role-name EC2-S3-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Attach role to EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-1234567890abcdef0 \
  --iam-instance-profile Name=EC2-S3-Access
```

**trust-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Principle of Least Privilege
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-app-bucket/*"
    }
  ]
}
```

### Enable MFA
```bash
# Enable MFA for IAM user
aws iam enable-mfa-device \
  --user-name developer \
  --serial-number arn:aws:iam::123456789012:mfa/developer \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

---

## EC2 Security

### Security Groups Configuration

**Best Practices:**
- Only open necessary ports
- Use specific IP ranges, not 0.0.0.0/0
- Separate security groups for different tiers

```bash
# Create security group
aws ec2 create-security-group \
  --group-name web-server-sg \
  --description "Web server security group" \
  --vpc-id vpc-12345678

# Allow SSH from specific IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/24  # Your office IP

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### SSH Key Management

```bash
# Generate strong SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Set proper permissions
chmod 400 ~/.ssh/my-key.pem

# Disable password authentication (on EC2)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PubkeyAuthentication yes

sudo systemctl restart sshd
```

### Disable Root Login

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Add/modify:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

### Keep System Updated

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Manual updates
sudo apt update && sudo apt upgrade -y
```

### Install Fail2Ban

```bash
# Install Fail2Ban (protects against brute-force)
sudo apt install fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

**/etc/fail2ban/jail.local:**
```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

```bash
# Start Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status sshd
```

---

## Network Security

### VPC Configuration

**Best Practices:**
- Use private subnets for databases
- Use public subnets for web servers
- Use NAT Gateway for private subnet internet access

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create public subnet
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a

# Create private subnet
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1a
```

### Network ACLs

```bash
# Create network ACL
aws ec2 create-network-acl --vpc-id vpc-12345678

# Allow inbound HTTP
aws ec2 create-network-acl-entry \
  --network-acl-id acl-12345678 \
  --ingress \
  --rule-number 100 \
  --protocol tcp \
  --port-range From=80,To=80 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow
```

### Use AWS WAF

```bash
# Create Web ACL
aws wafv2 create-web-acl \
  --name my-web-acl \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://rules.json
```

---

## Application Security

### Environment Variables

**❌ BAD:**
```javascript
// Hardcoded secrets
const DB_PASSWORD = "mypassword123";
const JWT_SECRET = "secret123";
```

**✅ GOOD:**
```javascript
// Use environment variables
const DB_PASSWORD = process.env.DB_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
```

### Input Validation

**Node.js/Express:**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/users',
  // Validation middleware
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().escape(),
  
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);
```

**FastAPI:**
```python
from pydantic import BaseModel, EmailStr, validator

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
```

### SQL Injection Prevention

**❌ BAD:**
```javascript
// Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

**✅ GOOD:**
```javascript
// Use parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
const result = await pool.query(query, [email]);
```

### XSS Prevention

**Node.js:**
```javascript
const helmet = require('helmet');
app.use(helmet());

// Sanitize user input
const xss = require('xss');
const clean = xss(userInput);
```

**FastAPI:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)
```

### Rate Limiting

**Node.js:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

**FastAPI:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/users")
@limiter.limit("10/minute")
async def get_users(request: Request):
    return {"users": []}
```

---

## Database Security

### RDS Security

```bash
# Create DB subnet group (private subnets)
aws rds create-db-subnet-group \
  --db-subnet-group-name my-db-subnet \
  --db-subnet-group-description "Private subnets for RDS" \
  --subnet-ids subnet-12345 subnet-67890

# Create RDS instance in private subnet
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password SecurePassword123! \
  --allocated-storage 20 \
  --db-subnet-group-name my-db-subnet \
  --vpc-security-group-ids sg-12345678 \
  --no-publicly-accessible  # Important!
```

### Enable Encryption

```bash
# Enable encryption at rest
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/12345678
```

### SSL/TLS for Database Connections

**PostgreSQL:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/rds-ca-cert.pem').toString()
  }
});
```

### Regular Backups

```bash
# Enable automated backups
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier mydb \
  --db-snapshot-identifier mydb-snapshot-$(date +%Y%m%d)
```

---

## Secrets Management

### AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name myapp/database-url \
  --description "Database connection string" \
  --secret-string "postgresql://user:pass@host:5432/db"

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id myapp/database-url
```

**Node.js:**
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ 
    SecretId: secretName 
  }).promise();
  
  return JSON.parse(data.SecretString);
}

// Usage
const dbUrl = await getSecret('myapp/database-url');
```

**FastAPI:**
```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
db_url = get_secret('myapp/database-url')
```

### Systems Manager Parameter Store (Free Alternative)

```bash
# Store parameter
aws ssm put-parameter \
  --name "/myapp/database-url" \
  --value "postgresql://..." \
  --type "SecureString"

# Retrieve parameter
aws ssm get-parameter \
  --name "/myapp/database-url" \
  --with-decryption
```

---

## Monitoring & Logging

### CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/ec2/myapp

# Create log stream
aws logs create-log-stream \
  --log-group-name /aws/ec2/myapp \
  --log-stream-name application-logs
```

### CloudWatch Alarms

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### AWS CloudTrail (Audit Logging)

```bash
# Create trail
aws cloudtrail create-trail \
  --name my-trail \
  --s3-bucket-name my-cloudtrail-bucket

# Start logging
aws cloudtrail start-logging --name my-trail
```

---

## SSL/TLS Configuration

### Let's Encrypt SSL

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by Certbot)
sudo certbot renew --dry-run
```

### AWS Certificate Manager

```bash
# Request certificate
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --validation-method DNS

# Validate via DNS
# Add CNAME records provided by ACM to your DNS
```

### Strong SSL Configuration

**Nginx:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Security Checklist

### EC2 Instance
- [ ] Use IAM roles instead of access keys
- [ ] Disable root login
- [ ] Use SSH keys only (no passwords)
- [ ] Enable automatic security updates
- [ ] Install and configure Fail2Ban
- [ ] Configure firewall (UFW)
- [ ] Restrict security group rules
- [ ] Enable CloudWatch monitoring

### Application
- [ ] Use environment variables for secrets
- [ ] Validate all user input
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Implement rate limiting
- [ ] Enable CORS properly
- [ ] Use HTTPS only
- [ ] Set security headers (helmet.js)
- [ ] Keep dependencies updated

### Database
- [ ] Use private subnets
- [ ] Enable encryption at rest
- [ ] Use SSL/TLS connections
- [ ] Strong passwords
- [ ] Regular backups
- [ ] Restrict security group access
- [ ] Enable audit logging

### Network
- [ ] Use VPC with public/private subnets
- [ ] Configure Network ACLs
- [ ] Use AWS WAF for web applications
- [ ] Enable DDoS protection (AWS Shield)
- [ ] Use CloudFront for static content

### Secrets
- [ ] Use AWS Secrets Manager or Parameter Store
- [ ] Never commit secrets to Git
- [ ] Rotate secrets regularly
- [ ] Use different secrets for dev/prod

### Monitoring
- [ ] Enable CloudWatch Logs
- [ ] Set up CloudWatch Alarms
- [ ] Enable CloudTrail for audit logging
- [ ] Monitor failed login attempts
- [ ] Set up billing alerts

---

## Common Security Mistakes

### 1. ❌ Exposing .env Files
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### 2. ❌ Using Default Ports
```bash
# Change SSH port from 22
sudo nano /etc/ssh/sshd_config
# Port 2222

sudo systemctl restart sshd
```

### 3. ❌ Not Using HTTPS
```bash
# Always redirect HTTP to HTTPS
# Nginx configuration shown in SSL section
```

### 4. ❌ Weak Passwords
```bash
# Use strong passwords (20+ characters)
# Use password managers
# Enable MFA
```

### 5. ❌ Public S3 Buckets
```bash
# Block public access
aws s3api put-public-access-block \
  --bucket my-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

## Security Tools

### 1. AWS Inspector
```bash
# Automated security assessment
aws inspector create-assessment-target \
  --assessment-target-name my-app \
  --resource-group-arn arn:aws:inspector:us-east-1:123456789012:resourcegroup/0-ABC123
```

### 2. AWS GuardDuty
```bash
# Enable threat detection
aws guardduty create-detector --enable
```

### 3. AWS Security Hub
```bash
# Centralized security view
aws securityhub enable-security-hub
```

---

## Incident Response

### If Compromised:

1. **Isolate the instance**
```bash
# Change security group to deny all traffic
aws ec2 modify-instance-attribute \
  --instance-id i-1234567890abcdef0 \
  --groups sg-isolated
```

2. **Create snapshot for forensics**
```bash
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "Forensic snapshot"
```

3. **Rotate all credentials**
```bash
# Rotate IAM access keys
aws iam create-access-key --user-name developer
aws iam delete-access-key --user-name developer --access-key-id OLD_KEY
```

4. **Review CloudTrail logs**
```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin
```

---

This security guide covers essential practices for securing your AWS deployments. Always follow the principle of least privilege and defense in depth!
