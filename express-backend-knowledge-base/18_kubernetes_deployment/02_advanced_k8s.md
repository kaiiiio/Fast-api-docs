# Kubernetes Advanced: Production-Ready Patterns

## 🛠️ Step 3: Managing Secrets & Configs
In production, never hardcode DB URLs or API Keys.

### 1. Kubernetes Secrets (Base64)
```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: express-db-secret
type: Opaque
data:
  DB_PASSWORD: bXlwYXNzd29yZA== # "mypassword" in base64
```

### 2. ConfigMaps (Application Configuration)
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: express-config
data:
  NODE_ENV: "production"
  PORT: "3000"
```

---

## 🌐 Step 4: Ingress (The Real Load Balancer)
A Service of type `LoadBalancer` creates a new IP for every app. This is expensive. Use **Ingress** to route a single IP to multiple apps.

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: express-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: express-service
            port:
              number: 80
```

---

## 📦 Step 5: Helm (The Package Manager)
Instead of 10 YAML files, use **Helm Charts** to template your K8s resources.

### Why Helm?
- **Variables**: Use `values.yaml` to change settings for Dev vs. Prod.
- **Versioning**: Rollback to a previous release with `helm rollback`.
- **Packaging**: Share your entire K8s setup as a single file.

---

## 🛡️ Step 6: Liveness & Readiness Probes
```yaml
# snippet for deployment.yaml
containers:
- name: express-api
  livenessProbe:
    httpGet:
      path: /health
      port: 3000
    initialDelaySeconds: 15
    periodSeconds: 20
  readinessProbe:
    httpGet:
      path: /ready
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 10
```

---

## 🛠️ Advanced CLI
```bash
# Decode a secret
kubectl get secret express-db-secret -o jsonpath='{.data.DB_PASSWORD}' | base64 --decode

# Port Forwarding (Local Testing without Service)
kubectl port-forward deployment/express-app 3000:3000

# Context Management
kubectl config use-context prod-cluster
```
