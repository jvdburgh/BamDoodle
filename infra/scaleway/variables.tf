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

variable "custom_hostnames" {
  type        = list(string)
  description = "Public hostnames bound to the container, e.g. [\"bamdoodle.io\", \"www.bamdoodle.io\"]. Point each at `container_endpoint` in DNS first (ALIAS for the root, CNAME for www), then apply; Scaleway issues the certificates."
  default     = []
}

variable "alert_email" {
  type        = string
  description = "Where Cockpit alerts and the 100 % budget warning go. Keep it in terraform.tfvars (gitignored)."
}

variable "alert_phone" {
  type        = string
  description = "Also text the 100 % budget warning to this number (e.g. +31…); empty for email only."
  default     = ""
}

variable "budget_id" {
  type        = string
  description = "The organization's existing Scaleway budget (Billing > Budget). The API lists it: GET /billing/v2/budgets."
}
