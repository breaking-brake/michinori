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

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Workload Identity provider for GitHub Actions"
}

output "github_actions_service_account" {
  value       = google_service_account.github_actions.email
  description = "Service account for GitHub Actions"
}
