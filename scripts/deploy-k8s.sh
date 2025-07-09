#!/bin/bash
# scripts/deploy-k8s.sh - Déploiement Kubernetes

set -euo pipefail

NAMESPACE="breslev-torah"
RELEASE_NAME="breslev-torah"
ENVIRONMENT="${1:-production}"

# Create namespace if not exists
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Create secrets
kubectl create secret generic breslev-secrets \
  --from-env-file=.env.$ENVIRONMENT \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Install/Upgrade Helm release
helm upgrade --install $RELEASE_NAME \
  ./infrastructure/k8s/helm/breslev-torah \
  --namespace $NAMESPACE \
  --values ./infrastructure/k8s/helm/breslev-torah/values.$ENVIRONMENT.yaml \
  --wait \
  --timeout 10m

# Check deployment status
kubectl rollout status deployment/$RELEASE_NAME-backend -n $NAMESPACE
kubectl rollout status deployment/$RELEASE_NAME-frontend -n $NAMESPACE

# Show access info
echo "Deployment complete!"
kubectl get ingress -n $NAMESPACE