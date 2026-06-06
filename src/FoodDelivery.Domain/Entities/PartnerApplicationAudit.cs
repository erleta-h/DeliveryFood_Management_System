namespace FoodDelivery.Domain.Entities;

public class PartnerApplicationAudit
{
    public long Id { get; set; }
    public long PartnerApplicationId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public long? CreatedByUserId { get; set; }

    public RestaurantPartnerApplication PartnerApplication { get; set; } = null!;
    public User? CreatedBy { get; set; }
}
