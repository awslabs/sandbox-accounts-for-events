namespace = "dce"
namespace_prefix = "dce"
aws_region = "us-east-1"
allowed_regions = [
    "us-east-1",
    "us-west-2"
  ]

check_budget_enabled = true
check_budget_schedule_expression = "rate(1 hour)"
fan_out_update_lease_status_schedule_expression = "rate(1 hour)"
populate_reset_queue_schedule_expression = "rate(1 hour)"
budget_notification_from_email = "noreply@example.com"
budget_notification_threshold_percentiles = [75, 100]
principal_budget_period = "WEEKLY"

max_lease_budget_amount = 1000
max_lease_period = 7776000

reset_nuke_toggle = "true"
reset_nuke_template_bucket = "STUB"
reset_nuke_template_key = "STUB"

cloudwatch_dashboard_toggle = "false"

accounts_table_rcu = 0
accounts_table_wcu = 0
leases_table_rcu = 0
leases_table_wcu = 0
usage_table_rcu  = 0
usage_table_wcu = 0
