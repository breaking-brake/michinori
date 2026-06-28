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

variable "gemini_api_key" {
  description = "Gemini API key for Cloud Run"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "breaking-brake"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "michinori"
}
