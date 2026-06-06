namespace FoodDelivery.Domain.Entities;

public class CouponAudit
{
    public long Id { get; set; }
    public long CouponId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public long? CreatedByUserId { get; set; }

    public Coupon Coupon { get; set; } = null!;
    public User? CreatedBy { get; set; }
}
