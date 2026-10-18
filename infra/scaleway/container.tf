# The game: one Rust process holding every room in memory, so exactly one instance (docs/decisions/0002 and 0003).

resource "scaleway_container_namespace" "main" {
  name        = local.app_name
  description = "BamDoodle Serverless Containers."
  project_id  = data.scaleway_account_project.this.id
}

resource "scaleway_container" "game" {
  name         = "${local.app_name}-game"
  description  = "BamDoodle game server and web app."
  namespace_id = scaleway_container_namespace.main.id

  image = "${scaleway_registry_namespace.main.endpoint}/${local.app_name}:${local.bootstrap_image_tag}"
  port  = 8080

  # Smallest tier; the server idles at a few MB. Raise both together if Cockpit shows CPU or memory pressure.
  cpu_limit          = 140
  memory_limit_bytes = 256000000

  # Rooms live in memory: never scale to zero mid-evening, never run two copies.
  min_scale = 1
  max_scale = 1

  # A WebSocket is one long request: allow the maximum (60 minutes). The client reconnects after that, keeping its
  # seat with its session token.
  timeout = 3600

  https_connections_only = true

  environment_variables = {
    RUST_LOG = "info"
  }

  startup_probe {
    http {
      path = "/api/health"
    }
    failure_threshold = 12
    interval          = "5s"
    timeout           = "5s"
  }

  liveness_probe {
    http {
      path = "/api/health"
    }
    failure_threshold = 3
    interval          = "30s"
    timeout           = "5s"
  }

  lifecycle {
    ignore_changes = [image]
  }
}

# Custom domains, once their DNS points at the container's endpoint. Scaleway then issues a Let's Encrypt certificate
# for each.
resource "scaleway_container_domain" "game" {
  for_each     = toset(var.custom_hostnames)
  container_id = scaleway_container.game.id
  hostname     = each.value
}
