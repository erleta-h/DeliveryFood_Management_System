namespace FoodDelivery.Domain.Entities;

public class RestaurantStaff
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long RestaurantId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long UserId { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public User User { get; set; } = null!;
}
