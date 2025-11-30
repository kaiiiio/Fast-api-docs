# Deployment Strategies

## 1. Rolling Update (K8s Default)

Replaces Pods one by one.
- **Pros**: Zero downtime. Easy.
- **Cons**: Hard to rollback instantly. You have a mix of v1 and v2 running simultaneously (DB compatibility issues!).

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
```

---

## 2. Blue/Green Deployment

1.  **Blue** (v1) is Live.
2.  Deploy **Green** (v2) alongside Blue.
3.  Run tests on Green (Private URL).
4.  **Switch Traffic**: Update the Load Balancer (Service) to point to Green.
5.  Delete Blue.

**Pros**: Instant Rollback (Switch back to Blue). No mixed versions.
**Cons**: Requires double resources (2x cost) during deployment.

---

## 3. Canary Deployment

1.  Deploy v2 to **10%** of users.
2.  Monitor Metrics (Error Rate, Latency).
3.  If Good -> Increase to 50% -> 100%.
4.  If Bad -> Rollback to 0%.

**Implementation (Istio / Argo Rollouts)**:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 1h}
      - setWeight: 50
      - pause: {duration: 10m}
```

---

## 4. Feature Flags (LaunchDarkly)

Decouple Deployment from Release.
Deploy v2 code, but hide it behind a flag.

```java
if (featureManager.isActive("new-checkout-flow")) {
    return newCheckout();
} else {
    return oldCheckout();
}
```

Enable the flag for internal users first, then 10%, then everyone.
