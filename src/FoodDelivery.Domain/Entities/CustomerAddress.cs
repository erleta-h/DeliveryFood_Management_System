namespace FoodDelivery.Domain.Entities;

public class CustomerAddress
{
    public long Id { get; set; }
    public string City { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public bool IsDefault { get; set; }
    public string Label { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public string Line1 { get; set; } = string.Empty;
    public string? Line2 { get; set; }
    public double? Longitude { get; set; }
    public string? Note { get; set; }
    public string? PostalCode { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public long UserId { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
