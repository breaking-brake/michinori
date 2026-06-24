terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.40"
    }
  }

  # Remote state (uncomment for team use)
  # backend "gcs" {
  #   bucket = "michinori-tfstate"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
