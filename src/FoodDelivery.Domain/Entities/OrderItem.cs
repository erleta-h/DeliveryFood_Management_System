namespace FoodDelivery.Domain.Entities;

public class OrderItem
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long MenuItemId { get; set; }
    public string NameSnapshot { get; set; } = string.Empty;
    public long OrderId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public MenuItem MenuItem { get; set; } = null!;
    public Order Order { get; set; } = null!;
}
