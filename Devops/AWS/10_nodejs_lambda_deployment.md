# Serverless Node.js with AWS Lambda

Deploying event-driven, scalable Node.js functions without managing servers.

## Key Terms

* **Serverless** (no server management): AWS runs/scales the runtime.
* **Lambda function** (event-run code): code executes only when triggered.
* **Cold start** (startup delay): first request after idle may be slower.
* **API Gateway** (HTTP front door): exposes Lambda as REST/HTTP API.
* **Event source** (trigger): S3 upload, cron, queue, HTTP request.
* **Execution role** (Lambda permissions): IAM role Lambda uses.
* **Timeout** (max runtime): Lambda stops after configured time.
* **Memory setting** (RAM and CPU share): more memory also gives more CPU.
* **Stage** (deployment environment): dev, staging, prod.
* **Serverless Framework** (deployment tool): packages and deploys Lambda config.

---

## 1. When to go Serverless?
- **Cost:** You only pay for exact execution time.
- **Scale:** Scales automatically to handle traffic spikes.
- **Low Maintenance:** No OS updates or hardware management.

---

## 2. Using the Serverless Framework
The industry standard for deploying Lambda functions.

```bash
npm install -g serverless
sls login
```

### serverless.yml
```yaml
service: my-node-api
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    DB_URL: ${env:DB_URL}

functions:
  hello:
    handler: handler.hello
    events:
      - httpApi:
          path: /
          method: get
```

---

## 3. Adapting an Express App (serverless-http)
You don't need to rewrite your Express app for Lambda.

```bash
npm install serverless-http
```

**handler.js:**
```javascript
const serverless = require('serverless-http');
const app = require('./app'); // Your Express App
module.exports.handler = serverless(app);
```

---

## 4. Deployment
```bash
sls deploy --stage prod
```

---

## 5. Senior Tips for Lambda
1. **Cold Starts:** Keep your bundle small. Use `esbuild` or Webpack to minify code.
2. **Database:** Use connection pooling sparingly. Serverless environments can reach connection limits quickly. Use **RDS Proxy** if needed.
3. **Secrets:** Don't put secrets in `serverless.yml`. Use **AWS Secrets Manager**.
