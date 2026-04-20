namespace FoodDelivery.Domain.Entities;

public class Payment
{
    public long Id { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? ExternalId { get; set; }
    public long OrderId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? RawPayload { get; set; }
    public int Status { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public Order Order { get; set; } = null!;
}
