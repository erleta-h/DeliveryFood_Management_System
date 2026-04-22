namespace FoodDelivery.Domain.Entities;

public class FavoriteRestaurant
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long RestaurantId { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public long UserId { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public User User { get; set; } = null!;
}
