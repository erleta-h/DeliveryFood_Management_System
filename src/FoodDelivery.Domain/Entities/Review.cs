namespace FoodDelivery.Domain.Entities;

public class Review
{
    public long Id { get; set; }
    public long AuthorUserId { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long? DriverUserId { get; set; }
    public long OrderId { get; set; }
    public int Rating { get; set; }
    public long? RestaurantId { get; set; }
    public int Subject { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public User Author { get; set; } = null!;
    public User? Driver { get; set; }
    public Order Order { get; set; } = null!;
    public Restaurant? Restaurant { get; set; }
}
