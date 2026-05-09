namespace FoodDelivery.Domain.Entities;

public class DriverProfile
{
    public long UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public bool IsOnline { get; set; }
    public DateTime? OnlineSinceUtc { get; set; }
    public DateTime? OnlineTallyDateUtc { get; set; }
    public int OnlineSecondsToday { get; set; }
    public int OffersAcceptedCount { get; set; }
    public int OffersDeclinedCount { get; set; }
    public int OffersTimedOutCount { get; set; }
    public double? LastLatitude { get; set; }
    public double? LastLongitude { get; set; }
    public DateTime? LastLocationAtUtc { get; set; }
    public string? LicensePlate { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public string VehicleType { get; set; } = string.Empty;

    public User User { get; set; } = null!;
}
