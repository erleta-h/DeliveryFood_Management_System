namespace FoodDelivery.Domain.Entities;

public class DriverProfile
{
    public long UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public bool IsOnline { get; set; }
    public string? LicensePlate { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public string VehicleType { get; set; } = string.Empty;

    public User User { get; set; } = null!;
}
