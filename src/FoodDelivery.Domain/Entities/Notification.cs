namespace FoodDelivery.Domain.Entities;

public class Notification
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public long UserId { get; set; }

    public User User { get; set; } = null!;
}
