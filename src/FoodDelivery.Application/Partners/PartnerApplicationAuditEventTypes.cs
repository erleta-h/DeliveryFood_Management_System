namespace FoodDelivery.Application.Partners;

public static class PartnerApplicationAuditEventTypes
{
    public const string ApplicationSubmitted = "application_submitted";
    public const string MarkedAsContacted = "marked_as_contacted";
    public const string ContractUploaded = "contract_uploaded";
    public const string ContractReplaced = "contract_replaced";
    public const string ApplicationApproved = "application_approved";
    public const string ApplicationRejected = "application_rejected";
    public const string StaffPasswordReset = "staff_password_reset";
}
