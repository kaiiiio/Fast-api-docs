# AWS Services Deployment Guide for MERN Stack Applications

This is a comprehensive revision guide detailing *what* each AWS service does, *why* it is used in a typical MERN (MongoDB, Express.js, React, Node.js) application, *when* it sits in the deployment sequence, and the *commands/steps* to set it up.

---

## Key Terms

* **MERN** (MongoDB, Express, React, Node): common full-stack JavaScript stack.
* **Backend API** (server logic): Express/Node routes, auth, database calls.
* **Static frontend** (built React files): HTML/CSS/JS served from S3/CloudFront.
* **Object storage** (file storage): S3 for uploads and frontend assets.
* **CDN** (global cache): CloudFront serves frontend/assets closer to users.
* **DNS** (domain to target): Route 53 maps domain names to AWS resources.
* **Reverse proxy** (front server): Nginx forwards requests to Node backend.
* **Managed database** (AWS-operated DB): RDS handles backups/patching/failover.
* **Cache** (fast temporary data): ElastiCache/Redis reduces DB load.
* **CI/CD** (automated build/deploy): CodePipeline/GitHub Actions deploy changes.

---

## 🧭 Overview of Services & Their Roles

| Service | Category | Importance | Purpose in a MERN Application | Est. Cost |
| :--- | :--- | :--- | :--- | :--- |
| **EC2** | Compute | ⭐⭐⭐⭐⭐ Critical | Virtual servers to host your Node.js/Express backend API | $10-100+ |
| **S3** | Storage | ⭐⭐⭐⭐⭐ Critical | Hosting the React frontend (`index.html`, etc.) and user uploads | $0.023/GB |
| **RDS** | Database | ⭐⭐⭐⭐⭐ Critical | Managed SQL databases (if you move from Mongo to Postgres/MySQL) | $15-200+ |
| **Lambda** | Compute | ⭐⭐⭐⭐ Important | Serverless functions (e.g., resizing uploaded S3 images via background code) | $0.20/1M req |
| **CloudFront**| CDN | ⭐⭐⭐⭐ Important | Caching React assets worldwide for fast loading speeds | $0.085/GB |
| **Route 53** | DNS | ⭐⭐⭐⭐ Important | Domain mapping (e.g., pointing `myapp.com` to React & backend) | $0.50/zone |
| **VPC** | Network | ⭐⭐⭐⭐ Important | Network isolation (Securing DBs from public internet access) | Free |
| **ECS/Fargate**| Compute | ⭐⭐⭐ Useful | Docker container orchestration (running a containerized Node.js app) | $0.04/vCPU/hr |
| **ElastiCache**| Database | ⭐⭐⭐ Useful | Redis/Memcached caching (speeds up heavy backend queries) | $15-100+ |
| **CloudWatch** | Monitoring | ⭐⭐⭐ Useful | Viewing server logs, tracking EC2 CPU utilization | $0.50/GB |
| **CodePipeline**| CI/CD | ⭐⭐ Nice-to-Have| Auto-deploying code from GitHub directly to EC2 or S3 | $1/pipeline |
| **DynamoDB** | Database | ⭐⭐ Nice-to-Have| Serverless NoSQL database (A completely AWS-managed alternative to MongoDB)| $1.25/GB |

---

## 🏗️ Step-by-Step Implementation Sequence

### Phase 1: Security & Networking (The Foundation)
You must build the logical boundaries before deploying servers to ensure your database isn't publicly accessible to hackers.

#### 1. Amazon VPC (Virtual Private Cloud)
*   **Why:** To create an isolated private network in the cloud.
*   **When:** **First Step**. Before creating any server or database.
*   **Steps:**
    1. Create a VPC in the AWS Console.
    2. Setup 2 Subnets: A **Public Subnet** (for EC2/Load Balancers) and a **Private Subnet** (for the database).
    3. Configure an Internet Gateway to allow external internet traffic into the Public Subnet.

---

### Phase 2: The Database Layer (The 'M' in MERN)
*Note: A standard MERN stack uses MongoDB. You can run MongoDB independently on an EC2 instance, use MongoDB Atlas, OR swap MongoDB for AWS's managed NoSQL (**DynamoDB**) or Relational (**RDS**) options.*

#### 1. Amazon RDS, DynamoDB, or EC2-MongoDB
*   **Why:** To store the core application data (Users, Posts, Products).
*   **When:** **Second Step**. You need the Database Connection URL *before* configuring your backend code.
*   **Steps:**
    1. Provision the database inside the **Private Subnet** of your VPC.
    2. Configure "Security Groups" to only allow incoming traffic on port 27017 (Mongo) or 5432 (Postgres) *only* from the EC2 backend instance.
    3. Generate DB credentials and connection string.

#### 2. Amazon ElastiCache (Optional)
*   **Why:** To cache frequent, repetitive database queries using Redis. This massively speeds up API response times.

---

### Phase 3: Backend Compute (The 'E' & 'N' in MERN)
Here is where Express.js and Node.js will run.

#### 1. Amazon EC2 & Amazon EBS
*   **Amazon EC2:** Virtual servers in the cloud (the computer itself).
*   **Amazon EBS:** Block storage for EC2 (the high-speed hard drive attached to the computer, used to store the OS system logs and project code).
*   **Why:** To run your backend API 24/7 constantly listening for HTTP requests.
*   **When:** **Third Step**.
*   **Steps & Commands:**
    1. Launch an Ubuntu EC2 instance in the Public Subnet. Attach an EBS volume (default 8GB is fine).
    2. Edit Security Groups to open Port 80 (HTTP) and Port 22 (SSH).
    3. SSH into the server and deploy Node.js using terminal commands:

    ```bash
    # Connect to the EC2 server
    ssh -i "your-key.pem" ubuntu@<ec2-public-ip>

    # Update system packages & install Node.js
    sudo apt update
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs

    # Install PM2 (Keeps backend running after you close the terminal)
    sudo npm install -g pm2

    # Clone code and install dependencies
    git clone https://github.com/your/backend-repo.git
    cd backend-repo
    npm install

    # Add environment variables (DB Connection)
    nano .env  

    # Start the server with PM2
    pm2 start index.js --name "mern-backend"
    pm2 save
    pm2 startup
    ```

#### Alternative Backend Options:
*   **AWS Elastic Beanstalk:** "Easy app deployment". Instead of running SSH commands, you upload a ZIP of your Node app to the Console, and AWS provisions the EC2, Load Balancers, and auto-scaling entirely for you.
*   **Amazon ECS (Container Management):** If you use Docker, ECS takes your backend Docker Images and orchestrates running them seamlessly.
*   **AWS Lambda:** "Serverless execution". Instead of renting a whole EC2 running 24/7, you upload individual API route functions. AWS spins up code execution *only* when an API is called, charging you per millisecond. 

---

### Phase 4: Frontend Deployment (The 'R' in MERN)

#### 1. Amazon S3 (Object Storage)
*   **Why:** Do not use EC2 for React! React code compiles down to purely static HTML/CSS/JS. Amazon S3 is extremely cheap, static Object Storage meant for exact things like this and user-uploaded media (PDFs, images).
*   **When:** **Fourth Step**. Since React relies on fetching data from the backend, you build React locally with the EC2's public IP/domain attached, then push it to S3.
*   **Steps & Commands:**
    1. Create an S3 Bucket. Enable **"Static Website Hosting"**.
    2. Disable "Block all public access" and attach a Public Read bucket policy.
    
    ```bash
    # Locally, build your React app
    npm run build
    
    # Push the static build folder to the S3 bucket using AWS CLI
    aws s3 sync build/ s3://my-custom-react-bucket-name
    ```

#### 2. Amazon CloudFront
*   **Why:** S3 is region-specific (e.g., USA). CloudFront is a Content Delivery Network (CDN) that copies your React code to Edge locations globally. A user in India will load the app instantly from an Indian server rather than querying the USA S3 bucket.
*   **Steps:** Connect your S3 bucket as an "Origin" to a new CloudFront distribution.

---

### Phase 5: Routing & Scaling

#### 1. Amazon Route 53 (DNS Service)
*   **Why:** Route 53 turns the messy IP addresses and CloudFront URLs into a clean domain name (e.g., `myapp.com`).
*   **When:** **Fifth Step**. Once S3 and EC2 are live.
*   **Steps:** 
    1. Register a domain in Route 53.
    2. Map the base domain `myapp.com` via an "A Record" to your CloudFront Distribution.
    3. Map a subdomain `api.myapp.com` to your EC2 instance.

#### 2. Elastic Load Balancing (ELB)
*   **Why:** Distributes incoming traffic. Once your app grows, one EC2 instance isn't enough. You spin up 3 EC2 instances and place an ELB in front. It checks which EC2 is least busy and sends traffic there.

---

### Phase 6: Archiving, Analytics, and Monitoring (Post-Launch)

#### 1. Amazon CloudWatch
*   **Why:** Collects backend error logs, and monitors EC2 CPU/memory spikes to ensure the app is healthy.

#### 2. Amazon Glacier
*   **Why:** Low-cost archival storage. Example: After a user deletes a photo in your app, you might legally need to keep a backup. Do not keep it in S3 (expensive). Move it to Glacier for pennies.

#### 3. Amazon Redshift
*   **Why:** Data warehousing. Over months, your backend DB gets massive. Running complex marketing queries ("How many users born before 1990 bought X during summer?") would crash standard Mongo/RDS DBs. You replicate DB data to Redshift specifically to run heavy analytics securely.
