namespace FoodDelivery.Domain.Entities;

public class DeliveryZone
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public decimal DeliveryFee { get; set; }
    public decimal MinOrderAmount { get; set; }
    public int EstimatedDeliveryMinutes { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<Restaurant> Restaurants { get; set; } = new List<Restaurant>();
}
