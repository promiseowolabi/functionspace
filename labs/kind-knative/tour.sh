#!/usr/bin/env bash
# A read-only tour of what `kn quickstart kind` installed. Changes nothing.
set -u
hr() { printf '\n== %s\n' "$1"; }

hr "nodes"
kubectl get nodes -o wide

hr "Knative Serving — the control plane for request-driven workloads"
kubectl get deploy -n knative-serving

hr "Kourier — the ingress (an Envoy gateway + its controller)"
kubectl get deploy,svc -n kourier-system

hr "Knative Eventing — sources, brokers, triggers, channels"
kubectl get deploy -n knative-eventing

hr "custom resource definitions Knative added"
kubectl get crd -o name | grep knative | sed 's#customresourcedefinition.apiextensions.k8s.io/##' | sort

hr "the domain every Route is published under"
kubectl get cm config-domain -n knative-serving \
  -o go-template='{{range $k, $v := .data}}{{if ne $k "_example"}}{{$k}}{{"\n"}}{{end}}{{end}}'

hr "autoscaler defaults (these numbers come back in K1)"
kubectl get cm config-autoscaler -n knative-serving -o jsonpath='{.data._example}' \
  | grep -E '^(stable-window|panic-window-percentage|panic-threshold-percentage|container-concurrency-target-percentage|container-concurrency-target-default|scale-to-zero-grace-period|enable-scale-to-zero):'

hr "the example broker quickstart created"
kubectl get broker -A
