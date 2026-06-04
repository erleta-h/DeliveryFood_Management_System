namespace FoodDelivery.Application.Drivers;

public static class DriverApplicationAuditEventTypes
{
    public const string ApplicationSubmitted = "application_submitted";
    public const string ApplicationApproved = "application_approved";
    public const string ApplicationRejected = "application_rejected";
    public const string ActivationEmailSent = "activation_email_sent";
    public const string ActivationEmailResent = "activation_email_resent";
    public const string AccountActivated = "account_activated";
}
