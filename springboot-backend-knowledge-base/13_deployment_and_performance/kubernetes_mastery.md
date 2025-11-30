# Kubernetes (K8s) for Spring Boot

## 1. The Basics

You don't deploy "Containers" to K8s. You deploy **Pods**.
But Pods die. So you deploy **Deployments**.
But Deployments move. So you deploy **Services**.

---

## 2. Deployment Manifest (`deployment.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3 # Scale to 3 instances
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myregistry/myapp:v1
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
```

**Key Features**:
- **Probes**: K8s asks Actuator "Are you alive?". If not, it restarts the Pod.
- **Resources**: Prevent one app from eating the whole node.

---

## 3. Service Manifest (`service.yaml`)

Exposes the Pods internally.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP # Internal only
```

---

## 4. ConfigMap (External Config)

Don't put `application.properties` in the Docker image.
Inject it at runtime.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  application.yaml: |
    logging.level.root: INFO
    spring.datasource.url: jdbc:postgresql://db-service:5432/mydb
```

**Mounting it**:
```yaml
      volumes:
      - name: config-volume
        configMap:
          name: myapp-config
      containers:
      - volumeMounts:
        - name: config-volume
          mountPath: /config
```

---

## 5. Spring Cloud Kubernetes

If you want "Cloud Native" features (Service Discovery, Dynamic Config Reload) without a sidecar (Istio).

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-kubernetes-client-all</artifactId>
</dependency>
```

- **DiscoveryClient**: `discoveryClient.getInstances("other-service")` queries K8s API.
- **ConfigWatcher**: Reloads beans when ConfigMap changes (Hot Reload).
