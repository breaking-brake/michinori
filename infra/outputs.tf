output "service_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "Cloud Run service URL"
}

output "service_account_email" {
  value       = google_service_account.cloudrun.email
  description = "Cloud Run service account"
}

output "artifact_registry" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}"
  description = "Artifact Registry repository URI"
}
