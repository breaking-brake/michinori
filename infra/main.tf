locals {
  apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.apis)
  service  = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = "michinori"
  format        = "DOCKER"
  description   = "Michinori container images"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "cloudrun" {
  account_id   = "michinori-cloudrun"
  display_name = "Michinori Cloud Run"
}
