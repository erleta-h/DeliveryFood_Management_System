namespace FoodDelivery.Domain.Entities;

public class DriverApplicationAudit
{
    public long Id { get; set; }
    public long DriverApplicationId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public long? CreatedByUserId { get; set; }

    public DriverApplication DriverApplication { get; set; } = null!;
    public User? CreatedBy { get; set; }
}
