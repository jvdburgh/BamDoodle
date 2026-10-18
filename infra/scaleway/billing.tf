# The organization's budget (shared with AmputatorBot, made in the console) already warns at 50 % and 75 % of its
# monthly limit. This adds the warning at 100 %, by email and (when set) SMS. A Scaleway budget only warns: nothing is
# stopped when it's reached.
resource "scaleway_billing_budget_alert" "limit_reached" {
  budget_id = var.budget_id
  threshold = 100
}

resource "scaleway_billing_budget_alert_notification" "limit_reached_email" {
  budget_alert_id = scaleway_billing_budget_alert.limit_reached.id
  email_addresses = [var.alert_email]
}

resource "scaleway_billing_budget_alert_notification" "limit_reached_sms" {
  count             = var.alert_phone == "" ? 0 : 1
  budget_alert_id   = scaleway_billing_budget_alert.limit_reached.id
  sms_phone_numbers = [var.alert_phone]
}
