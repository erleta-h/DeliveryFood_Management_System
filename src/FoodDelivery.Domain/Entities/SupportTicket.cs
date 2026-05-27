namespace FoodDelivery.Domain.Entities;

public class SupportTicket
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int Status { get; set; }
    public int Category { get; set; }
    public int Priority { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? AdminNote { get; set; }
    public long? OrderId { get; set; }
    public long? RestaurantId { get; set; }
    public long? DriverId { get; set; }
    public long? AssignedToUserId { get; set; }

    public User User { get; set; } = null!;
    public Order? Order { get; set; }
    public Restaurant? Restaurant { get; set; }
    public User? Driver { get; set; }
    public User? AssignedTo { get; set; }
    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
    public ICollection<SupportTicketAudit> Audits { get; set; } = new List<SupportTicketAudit>();
}
