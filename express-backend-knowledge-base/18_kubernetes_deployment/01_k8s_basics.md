# Express.js Production: Kubernetes Deployment (K8s)

## 🐳 Step 1: Dockerize the Express App
Before K8s, we need a container image.

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🏗️ Step 2: Kubernetes Resources

### 1. Deployment (Desired State)
Manages the lifecycle of your Express Pods.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: express-app
spec:
  replicas: 3 # Run 3 instances for High Availability
  selector:
    matchLabels:
      app: express-api
  template:
    metadata:
      labels:
        app: express-api
    spec:
      containers:
      - name: express-container
        image: my-docker-hub/express-api:v1
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: express-config
```

### 2. Service (Networking)
Exposes your pods to the world or internal traffic.

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: express-service
spec:
  selector:
    app: express-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer # Use NodePort for local, LoadBalancer for Cloud (AWS/GCP)
```

### 3. Horizontal Pod Autoscaler (HPA)
Automatically scales pods based on CPU/RAM usage.

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: express-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: express-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 🧠 Key Production Concepts
- **Liveness Probe**: Restarts the pod if your Express server crashes or hangs.
- **Readiness Probe**: Ensures a pod doesn't receive traffic until the database connection is ready.
- **ConfigMaps/Secrets**: Store your Environment Variables and DB Credentials safely outside the image.

---

## 🛠️ CLI Cheat Sheet
```bash
# Apply configs
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Check status
kubectl get pods
kubectl get svc

# View logs
kubectl logs -f deployment/express-app
```