# Private registry for the BamDoodle image (Rust server with the web app inside).
resource "scaleway_registry_namespace" "main" {
  name        = local.app_name
  description = "Docker images for BamDoodle."
  is_public   = false
  project_id  = data.scaleway_account_project.this.id
}
