resource "google_storage_bucket" "quota" {
  name     = "${var.project_id}-michinori-quota"
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = true

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket_iam_member" "cloudrun_quota" {
  bucket = google_storage_bucket.quota.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.cloudrun.email}"
}
