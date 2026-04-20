namespace FoodDelivery.Domain.Entities;

public class OrderStatusHistory
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public string? Note { get; set; }
    public long OrderId { get; set; }
    public int Status { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public Order Order { get; set; } = null!;
}
