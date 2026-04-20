namespace FoodDelivery.Domain.Entities;

public class OrderCoupon
{
    public long Id { get; set; }
    public long CouponId { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public decimal DiscountAmount { get; set; }
    public long OrderId { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public Coupon Coupon { get; set; } = null!;
    public Order Order { get; set; } = null!;
}
