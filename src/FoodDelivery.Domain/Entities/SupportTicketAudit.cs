namespace FoodDelivery.Domain.Entities;

public class SupportTicketAudit
{
    public long Id { get; set; }
    public long SupportTicketId { get; set; }
    public long ActorUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public SupportTicket SupportTicket { get; set; } = null!;
    public User Actor { get; set; } = null!;
}
