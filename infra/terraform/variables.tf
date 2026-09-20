variable "project_id" {
  description = "GCP project ID to deploy the GKE-hosted control tower into."
  type        = string
}

variable "region" {
  description = "GCP region for the cluster and network."
  type        = string
  default     = "us-east1"
}

variable "cluster_name" {
  description = "Name of the GKE cluster."
  type        = string
  default     = "multicloud-platform-console"
}

variable "node_count" {
  description = "Number of nodes in the default node pool."
  type        = number
  default     = 2
}
