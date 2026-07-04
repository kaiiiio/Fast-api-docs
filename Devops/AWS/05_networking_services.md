# AWS Networking & Content Delivery

Architecting a secure and fast network for your application.

## Key Terms

* **VPC** (private AWS network): isolated network for your resources.
* **Public subnet** (internet reachable): used for load balancers/bastion/public apps.
* **Private subnet** (not internet reachable): used for databases/internal services.
* **Internet Gateway / IGW** (internet access for VPC): lets public subnet reach internet.
* **NAT Gateway** (outbound internet for private subnet): private resources can download updates.
* **Route table** (traffic rules): decides where network traffic goes.
* **Security Group** (stateful firewall): allows return traffic automatically.
* **NACL** (stateless subnet firewall): inbound/outbound rules both matter.
* **DNS** (name to IP lookup): Route 53 maps domain names to resources.
* **CDN** (global edge cache): CloudFront serves content near users.

---

## 1. Amazon VPC (Virtual Private Cloud)
**The Virtual Data Center:** An isolated portion of the AWS Cloud.

### Core Components
- **Subnets:** 
  - **Public:** Connected to an Internet Gateway (can be reached from outside).
  - **Private:** Not reachable from the internet (perfect for Databases).
- **NAT Gateway:** Allows private instances to download updates from the internet without being exposed.
- **Security Groups:** Statefull firewalls at the Instance level.
- **NACLs:** Stateless firewalls at the Subnet level.

---

## 2. Amazon Route 53
**Managed DNS:** Highly available and scalable DNS service.

### Features
- **Health Checks:** Monitor application endpoints and reroute traffic if down.
- **Routing Policies:** Simple, Weighted (A/B testing), Latency-based (fastest route).
- **Domain Registration:** Buy domains directly via AWS.

---

## 3. Amazon CloudFront
**Content Delivery Network (CDN):** Fast global delivery of static and dynamic content.

### Why use it?
- **Low Latency:** Content is cached at "Edge Locations" near the user.
- **SSL Termination:** Free certificates via ACM.
- **Security:** Integrated with AWS Shield for DDoS protection.
- **S3 Integration:** Securely serve S3 objects using Origin Access Control (OAC).

---

## 4. Elastic Load Balancing (ELB)
**Distribution:** Routes incoming traffic to multiple targets (EC2s, Containers, Lambdas).

- **Application Load Balancer (ALB):** Routes based on URL path/host (HTTP/S).
- **Network Load Balancer (NLB):** High performance for TCP/UDP traffic.
- **Gateway Load Balancer:** For third-party virtual appliances.
