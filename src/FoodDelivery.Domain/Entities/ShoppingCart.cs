
namespace FoodDelivery.Domain.Entities;

public class ShoppingCart
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long? RestaurantId { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public long UserId { get; set; }

    public Restaurant? Restaurant { get; set; }
    public User User { get; set; } = null!;
    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}
