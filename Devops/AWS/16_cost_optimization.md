# AWS Cost Optimization for Fullstack Developers

Don't let your cloud bill surprise you.

## 1. Rightsizing
**Stop Overprovisioning:** Check CloudWatch metrics. If your `t3.large` instance never exceeds 5% CPU, move it to a `t3.small` or `t3.micro`.

---

## 2. Savings Plans & Reserved Instances
**Commitment = Discount:** If you know your server will run 24/7 for a year, don't pay "On-Demand" prices.
- **Savings Plans:** Commit to an hourly spend ($/hour) for 1 or 3 years. Up to 72% savings.
- **Reserved Instances:** Commit to a specific instance type/size.

---

## 3. S3 Lifecycle Policies
**Automatic Tiering:** Files that aren't accessed for 30 days should automatically move to **S3 Standard-IA** or **Glacier**. 
- Enable **Intelligent-Tiering** to let AWS manage this for you.

---

## 4. Spot Instances
**Unused Capacity:** Use spare AWS capacity for a massive discount (up to 90%).
- **Warning:** AWS can take them back with a 2-minute notice.
- **Best for:** Non-critical background workers, CI/CD runners, or batch processing.

---

## 5. Billing Alerts & Budgets
**Safety First:**
1. **CloudWatch Billing Alarm:** Create an alarm that fires when your expected monthly bill exceeds $10.
2. **AWS Budgets:** Set monthly limits and get notified at 50%, 80%, and 100% of the threshold.

---

## Senior Tip 💡
Before launching any service, check the **AWS Pricing Calculator**. Most "hidden" costs come from:
- Data Transfer (Egress).
- Provisioned IOPS on EBS.
- NAT Gateways.
