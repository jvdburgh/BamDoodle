variable "region" {
  type        = string
  description = "Scaleway region for everything. Amsterdam: closest to most players, and BamDoodle needs no database."
  default     = "nl-ams"
}

variable "app_name" {
  type        = string
  description = "Prefix for resource names (registry namespace, container namespace, container)."
  default     = "bamdoodle"
}

variable "project_name" {
  type        = string
  description = "Name of the Scaleway project to deploy into (looked up by name)."
  default     = "bamdoodle"
}

variable "custom_hostname" {
  type        = string
  description = "Public hostname bound to the container, e.g. play.bamdoodle.io. Empty: no custom domain yet, use the container's own endpoint. Create the DNS CNAME to `container_endpoint` before setting this."
  default     = ""
}
