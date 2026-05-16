namespace FoodDelivery.Domain.Entities;

/// <summary>Mesazh në thread-in e tiketës (klient ose staf support/admin).</summary>
public class SupportTicketMessage
{
    public long Id { get; set; }
    public long SupportTicketId { get; set; }
    public long AuthorUserId { get; set; }
    public string Body { get; set; } = string.Empty;
    /// <summary>True kur përgjigjja vjen nga përdorues me leje <c>admin.support</c>.</summary>
    public bool IsStaffReply { get; set; }
    public DateTime CreatedAt { get; set; }

    public SupportTicket SupportTicket { get; set; } = null!;
    public User Author { get; set; } = null!;
}
