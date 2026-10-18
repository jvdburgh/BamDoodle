# Cockpit's alert manager and who it emails (decision 0005). The 5-year retention and the alert rules themselves are
# on Scaleway's own data sources, which Terraform doesn't manage: `just cockpit` sets those.
resource "scaleway_cockpit_alert_manager" "main" {
  project_id = data.scaleway_account_project.this.id

  contact_points {
    email = var.alert_email
  }
}
