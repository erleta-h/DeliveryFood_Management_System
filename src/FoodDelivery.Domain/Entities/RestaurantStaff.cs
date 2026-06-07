namespace FoodDelivery.Domain.Entities;

public class RestaurantStaff
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long RestaurantId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long UserId { get; set; }
    /// <summary>Null until an update path exists — membership rows are insert-only today.</summary>
    public DateTime? UpdatedAt { get; set; }
    /// <summary>Null until an update path exists — membership rows are insert-only today (seed, import, partner approval).</summary>
    public long? UpdatedById { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public User User { get; set; } = null!;
}
