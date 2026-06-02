namespace FoodDelivery.Application.Notifications;

public static class NotificationTypes
{
    public const string OrderStatus = "order_status";
    public const string PartnerApplication = "partner_application";
    public const string DriverApplication = "driver_application";
    public const string OrderNew = "order_new";
    public const string SupportTicketNew = "support_ticket";
    public const string SupportClientReply = "support_client_reply";

    /// <summary>Format: <c>support_ticket:42</c> për lidhje direkte te tiketa.</summary>
    public static string EncodeWithTicket(string baseType, long ticketId) =>
        ticketId > 0 ? $"{baseType}:{ticketId}" : baseType;

    public static string BaseType(string storedType)
    {
        var i = storedType.IndexOf(':');
        return i > 0 ? storedType[..i] : storedType;
    }

    public static long? TicketIdFromType(string storedType)
    {
        var i = storedType.IndexOf(':');
        if (i < 0 || i >= storedType.Length - 1)
            return null;
        return long.TryParse(storedType[(i + 1)..], out var id) ? id : null;
    }

    public static string? AdminLinkPath(string storedType)
    {
        var baseType = BaseType(storedType);
        var ticketId = TicketIdFromType(storedType);

        if (baseType is SupportTicketNew or SupportClientReply)
            return ticketId is > 0 ? $"/admin/support?ticket={ticketId}" : "/admin/support";

        return baseType switch
        {
            PartnerApplication => "/admin/partner-applications",
            DriverApplication => "/admin/driver-applications",
            OrderNew => "/admin/orders",
            _ => null,
        };
    }
}
