namespace FoodDelivery.Domain.Entities;

/// <summary>Mesazhe teksti ndërmjet klientit dhe korrierit për një porosi (pas pranimit të dërgesës).</summary>
public class OrderDeliveryChatMessage
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long SenderUserId { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public Order Order { get; set; } = null!;
    public User Sender { get; set; } = null!;
}
