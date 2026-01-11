# Serverless Node.js with AWS Lambda

Deploying event-driven, scalable Node.js functions without managing servers.

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
