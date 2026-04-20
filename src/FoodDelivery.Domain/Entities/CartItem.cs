namespace FoodDelivery.Domain.Entities;

public class CartItem
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long MenuItemId { get; set; }
    public int Quantity { get; set; }
    public long ShoppingCartId { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public MenuItem MenuItem { get; set; } = null!;
    public ShoppingCart ShoppingCart { get; set; } = null!;
}
