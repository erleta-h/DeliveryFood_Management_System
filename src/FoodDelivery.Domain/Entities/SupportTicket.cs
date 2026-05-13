namespace FoodDelivery.Domain.Entities;

public class SupportTicket
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    /// <summary>0 = hapur, 1 = mbyllur.</summary>
    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? AdminNote { get; set; }
    /// <summary>Lidhje opsionale me porosi (duhet të jetë e klientit).</summary>
    public long? OrderId { get; set; }
    /// <summary>Lidhje opsionale me restorant (kontekst ankesës).</summary>
    public long? RestaurantId { get; set; }

    public User User { get; set; } = null!;
    public Order? Order { get; set; }
    public Restaurant? Restaurant { get; set; }
    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}
