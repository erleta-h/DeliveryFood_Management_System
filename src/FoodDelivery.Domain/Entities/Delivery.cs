namespace FoodDelivery.Domain.Entities;

public class Delivery
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public long DriverUserId { get; set; }
    public long OrderId { get; set; }
    public DateTime? PickedUpAt { get; set; }
    public int Status { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public User Driver { get; set; } = null!;
    public Order Order { get; set; } = null!;
}
