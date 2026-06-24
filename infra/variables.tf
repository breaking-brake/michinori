variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "container_image" {
  description = "Container image URI for Cloud Run"
  type        = string
  default     = ""
}
