output "registry_endpoint" {
  description = "Registry to push images to, e.g. rg.nl-ams.scw.cloud/bamdoodle."
  value       = scaleway_registry_namespace.main.endpoint
}

output "container_id" {
  description = "Container ID (<region>/<uuid>). Goes into the SCW_CONTAINER_ID GitHub Actions secret."
  value       = scaleway_container.game.id
}

output "container_endpoint" {
  description = "Scaleway's own hostname for the container: for smoke tests, and the CNAME target for the custom domain."
  value       = scaleway_container.game.public_endpoint
}
