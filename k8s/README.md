# Kubernetes deployment

Manifests for deploying the XIO Agents API to a Kubernetes cluster.

## Build and push the image

```bash
docker build -t xio-agents-api:latest .
# tag and push to your registry, then update deployment.yaml's image field
```

## Apply order

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# copy the secret template, fill in real values, never commit secret.yaml
cp k8s/secret.example.yaml k8s/secret.yaml
# edit k8s/secret.yaml with real DB credentials
kubectl apply -f k8s/secret.yaml

kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# optional, requires an ingress controller + cert-manager
kubectl apply -f k8s/ingress.yaml
```

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Isolates all resources under the `xio-agents` namespace |
| `configmap.yaml` | Non-secret runtime config (port, DB host/port/name, pool size) |
| `secret.example.yaml` | Template for DB credentials — copy to `secret.yaml` (gitignored), never commit real values |
| `deployment.yaml` | 3 replicas, rolling updates, resource limits, liveness/readiness probes on `/health`, runs as non-root |
| `service.yaml` | ClusterIP exposing port 80 → container port 3000 |
| `hpa.yaml` | Autoscales 3–20 pods on CPU (70%) and memory (80%) utilization |
| `ingress.yaml` | Optional external HTTPS entry point (nginx-ingress + cert-manager) |

## Notes

- `deployment.yaml` references image `xio-agents-api:latest` — replace with your registry path (e.g. `ghcr.io/marcelortz/xio-agents-api:v1.0.0`) before applying in a real cluster.
- The health check matches the one already used by the Dockerfile's `HEALTHCHECK` and the app's `/health` endpoint.
- `ingress.yaml` assumes an nginx ingress controller and cert-manager are installed; update `spec.ingressClassName` and the host if your cluster differs.
