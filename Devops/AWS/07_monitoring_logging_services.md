# Monitoring, Logging, and Audit

Keeping visibility into your production environment.

## 1. Amazon CloudWatch
**Metrics & Logs:** The central hub for monitoring.

- **Metrics:** Track CPU, Memory, Disk I/O, and custom app metrics.
- **Dashboards:** Visualize the health of your stack in one place.
- **Alarms:** Get notified (via SNS) if CPU > 80% or if there are too many 500 errors.
- **Log Groups:** Centralized storage for application and system logs.

---

## 2. AWS CloudTrail
**Compliance & Governance:** Records every API call made in your AWS account.

- **Who** made the change?
- **What** action was taken?
- **When** did it happen?
- Essential for security audits and troubleshooting "Who deleted the S3 bucket?"

---

## 3. AWS X-Ray
**Distributed Tracing:** Understand how requests flow through your microservices.

- Identify bottlenecks in the request path.
- Map service dependencies.
- Catch errors in specific deep-nested services.

---

## 4. Amazon EventBridge
**Event Bus:** Create event-driven architectures by routing events between AWS services.
- Connect your SaaS apps to AWS services.
- Schedule tasks (Serverless Crons).

---

## Recommended Setup
1. **Critical:** Enable CloudWatch Alarms for CPU and RDS Free Space.
2. **Mandatory:** Maintain CloudTrail logs for at least 90 days.
3. **Best Practice:** Use CloudWatch Logs Agent on EC2 to push application logs automatically.
