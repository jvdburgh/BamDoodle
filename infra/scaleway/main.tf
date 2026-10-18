# Credentials and default project come from ~/.config/scw/config.yaml (`scw init`), or from SCW_ACCESS_KEY,
# SCW_SECRET_KEY and SCW_DEFAULT_PROJECT_ID. CI never runs Terraform; it only swaps the container image.
provider "scaleway" {
  region = var.region
}

data "scaleway_account_project" "this" {
  name = var.project_name
}

locals {
  app_name = var.app_name

  # The first apply points the container at this tag (pushed by hand, see README). After that, the release workflow
  # moves the container to each released image; `ignore_changes = [image]` keeps Terraform from moving it back.
  bootstrap_image_tag = "bootstrap"
}
