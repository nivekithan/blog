---
title: "Deploying a Simple Web Server with HTTPS on K3s"
description: A step-by-step guide to deploying a web server with HTTPS on K3s, covering installation, service configuration, ingress setup, and automatic SSL certificate management with cert-manager.
pubDatetime: 2025-07-20T00:00:00.000Z
tags: ["kubernetes"]
featured: true
---

## Table of contents

## Why Kubernetes?

Previously, we self-hosted PostgreSQL on our Ubuntu VPS. While it worked, it required a lot of manual scripting and maintenance.

I want everything to be Infrastructure as Code (IaC). Since PostgreSQL is a stateful resource, certain IaC solutions like Terraform can't handle it effectively. From my research, I found two solutions that satisfy my requirements:

1. Ansible
2. Kubernetes

At first, I thought Ansible was a good option (and it could be), but I don't like Python and its ecosystem. I spent hours debugging why I couldn't install Ansible on my machine—it might have been a skill issue on my end.

Therefore, we're going with Kubernetes as our IaC solution. It's more complex, but I feel like I can learn it better and understand what's happening under the hood compared to Ansible.

## Why K3s?

Kubernetes is designed for orchestrating multiple containers across multiple nodes, and it has many components. In our case, we want it to handle a single node, which means the overhead of running a standard Kubernetes distribution is relatively high.

K3s, on the other hand, is a lightweight Kubernetes distribution with low overhead. It can run with minimum requirements of 2 vCPUs and 2 GB of memory.

So, we're going with K3s for managing our PostgreSQL.

## Goal of This Guide

Before starting any work related to PostgreSQL, I need to understand how K3s (and by extension, Kubernetes) works. We'll start by deploying a [simple web server](https://hub.docker.com/r/crccheck/hello-world/) with HTTPS support.

## Installing K3s

I'm running this on an Ubuntu 24.04 machine, and all commands assume that's your OS.

To install K3s, run:

```sh
curl -sfL https://get.k3s.io | K3S_RESOLV_CONF=/run/systemd/resolve/resolv.conf sh -
```

We add `K3S_RESOLV_CONF=/run/systemd/resolve/resolv.conf` due to a [known issue](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/#known-issues) that causes external DNS resolution to fail in containers. I'm not explaining it in depth (as I'm not a networking expert), but here's an AI-generated summary:

> On Ubuntu, Kubernetes clusters (like K3s) often face a DNS resolution problem for external domains. This arises because:
>
> 1. **systemd-resolved Stub**: Ubuntu uses systemd-resolved, which configures `/etc/resolv.conf` to point to a local stub resolver at 127.0.0.53.
> 2. **Kubelet's Role**: The Kubernetes kubelet copies the host's `resolv.conf` into pods but strips out loopback nameservers (e.g., 127.0.0.53).
> 3. **The Problem**: If 127.0.0.53 is the only nameserver, the pod's `resolv.conf` ends up empty, forcing Kubernetes to insert the ClusterDNS IP (CoreDNS's internal IP). This creates a recursive loop for external DNS queries, leading to "no such host" errors.
> 4. **The Solution**: By setting `K3S_RESOLV_CONF=/run/systemd/resolve/resolv.conf`, you instruct K3s to use the file containing actual public upstream DNS servers (e.g., 8.8.8.8), bypassing the problematic 127.0.0.53 stub.
> 5. **Outcome**: Pods get valid external nameservers, allowing CoreDNS to resolve external domains correctly and enabling tools like cert-manager to work out of the box.

### Verifying the Installation

Once installed, verify it by running:

```sh
kubectl version
```

Expected output:

```
Client Version: v1.32.6+k3s1
Kustomize Version: v5.5.0
Server Version: v1.32.6+k3s1
```

## Installing kubectl on Your Host Machine

With K3s installed on our VPS, let's install `kubectl` on your laptop or desktop to deploy applications to the Kubernetes cluster.

Run:

```sh
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
```

This installs the latest version of `kubectl`. Verify it with:

```sh
kubectl version
```

You'll see something like:

```
Client Version: v1.32.6
Kustomize Version: v5.5.0
The connection to the server localhost:8080 was refused - did you specify the right host or port?
```

## Connecting to the Kubernetes Cluster

The error above occurs because `kubectl` can't connect to the Kubernetes cluster yet. To fix this, copy the config file from the VPS:

```sh
rsync -avz kube:/etc/rancher/k3s/k3s.yaml ~/.kube/config
```

Edit `~/.kube/config` and replace the IP in this line:

```
server: https://127.0.0.1:6443
```

With your VPS's actual IP:

```
server: https://139.xxx.xxx.xxx:6443
```

Verify the connection:

```sh
kubectl version
```

Expected output:

```
Client Version: v1.32.6
Kustomize Version: v5.5.0
Server Version: v1.32.6+k3s1
```

## Deploying Your First Pod

Create a new directory and a file named `demo.yml` with this content:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-deploy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: demo
          image: crccheck/hello-world
          ports:
            - containerPort: 8000
```

In Kubernetes, we define applications and configurations in manifest files. This one creates a Deployment that runs a single Pod using the `crccheck/hello-world` image, exposing port 8000.

> This manifest defines a Kubernetes `Deployment` object. Here's a breakdown:
>
> - **`apiVersion: apps/v1`**: The API version for Deployments.
> - **`kind: Deployment`**: Specifies a Deployment, which manages Pods declaratively.
> - **`metadata.name: demo-deploy`**: Names the Deployment.
> - **`spec.replicas: 1`**: Runs one Pod replica.
> - **`spec.selector.matchLabels.app: demo`**: Selects Pods with the label `app: demo`.
> - **`spec.template`**: Defines the Pod template.
>   - **`metadata.labels.app: demo`**: Labels the Pods.
>   - **`spec.containers`**: Defines containers in the Pod.
>     - **`name: demo`**: Container name.
>     - **`image: crccheck/hello-world`**: Docker image.
>     - **`ports.containerPort: 8000`**: Exposes port 8000.
>
> In summary, this Deployment ensures one Pod runs the hello-world app, automatically replacing it if it fails.

Apply it:

```sh
kubectl apply -f demo.yml
```

Verify:

```sh
kubectl describe deployment demo-deploy
```

Expected output (abbreviated):

```
Name:                   demo-deploy
Namespace:              default
CreationTimestamp:      Sun, 20 Jul 2025 13:37:34 +0530
...
Replicas:               1 desired | 1 updated | 1 total | 1 available | 0 unavailable
...
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  2m    deployment-controller  Scaled up replica set demo-deploy-5c7d6dbdd4 from 0 to 1
```

## Deploying Your First Service

Pods aren't directly accessible; Services enable communication between them. Add this to `demo.yml`:

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: demo-service
spec:
  selector:
    app: demo
  ports:
    - port: 80
      targetPort: 8000
      protocol: TCP
```

A Service acts like a load balancer, grouping Pods under a single IP. Here, it forwards TCP traffic from port 80 to the Pods' port 8000.

Apply it:

```sh
kubectl apply -f demo.yml
```

Output:

```
deployment.apps/demo-deploy unchanged
service/demo-service created
```

Verify:

```sh
kubectl describe service demo-service
```

Expected output (abbreviated):

```
Name:              demo-service
Namespace:         default
...
Type:              ClusterIP
IP:                10.43.180.16
Port:              <unset>  80/TCP
TargetPort:        8000/TCP
Endpoints:         10.42.0.9:8000
...
```

## Deploying Ingress

Ingress routes external traffic to Services. In K3s, the default Ingress controller is [Traefik](https://traefik.io/traefik). Add this to `demo.yml`:

```yaml
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-ingress
  labels:
    name: demo-ingress
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - http:
        paths:
          - pathType: Prefix
            path: "/"
            backend:
              service:
                name: demo-service
                port:
                  number: 80
```

This routes all requests (prefix `/`) to `demo-service` on port 80, using Traefik's web entrypoint (port 80).

Apply it:

```sh
kubectl apply -f demo.yml
```

Output:

```
deployment.apps/demo-deploy unchanged
service/demo-service unchanged
ingress.networking.k8s.io/demo-ingress created
```

Test accessibility:

```sh
curl http://139.xxx.xxx.xxx/
```

Expected output:

```
<pre>
Hello World

                                       ##         .
                                 ## ## ##        ==
                              ## ## ## ## ##    ===
                           /""""""""""""""""\___/ ===
                      ~~~ {~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===- ~~~
                           \______ o          _,/
                            \      \       _,'
                             `'--.._\..--''
</pre>
```

You've now deployed your first app and made it available on the internet!

## Adding a Custom Domain

Currently, it's only accessible via HTTP. To add HTTPS, first add an A record in your DNS provider pointing to your VPS IP. Verify:

```sh
curl http://<your_domain>.com
```

(Expect the same hello-world output as above.)

## Installing cert-manager

[cert-manager](https://cert-manager.io/) handles issuing and renewing TLS certificates via Let's Encrypt. Install it:

```sh
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.18.2/cert-manager.yaml
```

This creates namespaces, CRDs, roles, and deployments. Wait for pods to run:

```sh
kubectl get pods --namespace cert-manager
```

Expected output:

```
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-69f748766f-x6pvc              1/1     Running   0          54s
cert-manager-cainjector-7cf6557c49-x6vrx   1/1     Running   0          54s
cert-manager-webhook-58f4cff74d-894nb      1/1     Running   0          54s
```

## Adding HTTPS Support

Set up a Let's Encrypt issuer. Add this to `demo.yml`:

```yaml
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: <username>@<email>.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
```

Modify the Ingress for HTTPS:

```yaml
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-ingress
  labels:
    name: demo-ingress
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - secretName: demo-tls-secret
      hosts:
        - <domain>.com
  rules:
    - host: <domain>.com
      http:
        paths:
          - pathType: Prefix
            path: "/"
            backend:
              service:
                name: demo-service
                port:
                  number: 80
```

This uses the `letsencrypt-prod` issuer for TLS on `<domain>.com`.

Apply it:

```sh
kubectl apply -f demo.yml
```

Output:

```
deployment.apps/demo-deploy unchanged
service/demo-service unchanged
ingress.networking.k8s.io/demo-ingress configured
clusterissuer.cert-manager.io/letsencrypt-prod created
```

Verify HTTPS:

```sh
curl https://<domain>.com
```

(Expect the hello-world output.)

## Adding Automatic HTTP to HTTPS Redirects

To redirect all HTTP requests to HTTPS, use a Traefik middleware. Add this to `demo.yml`:

```yaml
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-https
spec:
  redirectScheme:
    scheme: https
    permanent: true
```

Update the Ingress annotations:

```yaml
annotations:
  traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
  cert-manager.io/cluster-issuer: letsencrypt-prod
  traefik.ingress.kubernetes.io/router.middlewares: default-redirect-https@kubernetescrd
```

Apply it:

```sh
kubectl apply -f demo.yml
```

Verify the redirect:

```sh
curl -I http://<domain>.com
```

Expected output:

```
HTTP/1.1 308 Permanent Redirect
Location: https://<domain>.com/
Date: Sun, 20 Jul 2025 09:24:07 GMT
Content-Length: 18
```

## Conclusion

I'm happy with this setup—nearly all configurations are in a single file, making it easy to manage as IaC.

There are still some imperative steps, like installing cert-manager via a direct `kubectl apply` from a URL, and we're manually running `kubectl apply` for deployments. We'll address these in the next post.
