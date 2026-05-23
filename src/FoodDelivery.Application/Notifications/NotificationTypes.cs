namespace FoodDelivery.Application.Notifications;

public static class NotificationTypes
{
    public const string OrderStatus = "order_status";
    public const string PartnerApplication = "partner_application";
    public const string DriverApplication = "driver_application";
    public const string OrderNew = "order_new";
    public const string SupportTicketNew = "support_ticket";

    public static string? AdminLinkPath(string type) =>
        type switch
        {
            PartnerApplication => "/admin/partner-applications",
            DriverApplication => "/admin/driver-applications",
            OrderNew => "/admin/orders",
            SupportTicketNew => "/admin/support",
            _ => null,
        };
}
