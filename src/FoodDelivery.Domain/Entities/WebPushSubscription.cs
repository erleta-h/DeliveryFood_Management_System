namespace FoodDelivery.Domain.Entities;


public class WebPushSubscription
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
