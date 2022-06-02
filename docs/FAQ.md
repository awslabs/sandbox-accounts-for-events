# Frequently Asked Questions

**Q: Can I assign a lease to another user after lease creation?**

**A:** No, this is not possible. The email address which a lease is associated to is immutable. Terminate the lease and create a new one for the other user if needed.

**Q: Can I access an AWS account of another user, e.g. for support reasons?**

**A:** Yes, you can use the "Direct Lease Link" URL of a lease to be able to log in, regardless of user assignment. Anyone with a user account can log in with this URL, so keep it secret and only use/share it when really needed.
 
**Q: Can I assign one lease to multiple users?**

**A:** Leases can only be assigned to one user at a time. Additionally, you could use the "Direct Lease Link" to provide access for other users, but is not possible to limit the usage of this "Direct Leas Link" to specific users only.
 
**Q: I have AWS accounts being stuck in "NotReady" status forever. How can I resolve this issue?**

**A:** If an AWS account is stuck in "NotReady" status, the backend cannot successfully execute AWS Nuke cleanup process on this account. Log in to your master account and check the status and execution logs of the project "account-reset-dce" in AWS CodeBuild. In case AWS Nuke fails to delete some resources, you might want to look into the pre- and fix-cleanup.sh scripts described in the chapter above.
 
**Q: Can I re-activate a terminated lease?**

**A:** Terminated leases should stay terminated, just create a new lease when needed. In case you accidentally terminated a lease and need to prevent AWS Nuke from deleting the resources, you can manually re-activate the lease as long as the AWS Nuke cleanup scheduler has not kicked in:
1. Log in as admin.
2. Switch to "Manage Leases" page, find the lease, choose edit and set the lease status to "Active (Active)". Make sure that lease budget and expiration time allow enough headroom that this lease will not be terminated again on next scheduler run.
3. Click on the AWS account ID of the lease table record. You will be forwarded to the "Manage AWS Accounts" page. Edit the account and set the account status to "Leased".
_Note: You are directly editing the backend databases here. Make sure your edits are consistent, otherwise you could break the automated processes for this account/lease._
 
**Q: How can I make sure that users cannot exceed the lease budget I defined?**

**A:** This is not reliably possible. It can take up to 24hrs for billing data to be cumulated in AWS Cost and Usage report, i.e. users can exceed the lease budget limit within a 24hr period. Do not regard budget limits as a sufficient security mechanism to prevent misusage of AWS accounts. Instead, proactively limit access to more expensive services (like large AWS EC2 instances) via SCPs or Principal Policies if you fear uncontrollable usage and costs. Event and lease budgets should be seen as general usage guidelines and measures for cost control, but not as reliable safety mechanisms.

**Q: How can I change/add/remove allowed AWS regions for users?**

**A:** AWS regions for *Sandbox Accounts for Events* deployment and for lease usage are defined during deployment. See end of chapter [Children Accounts](accounts.md) for details.