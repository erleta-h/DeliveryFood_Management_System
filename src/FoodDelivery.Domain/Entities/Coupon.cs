namespace FoodDelivery.Domain.Entities;

public class Coupon
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public decimal DiscountPercent { get; set; }
    public bool IsActive { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    /// <summary>Porosia minimale (nëntotali) për të aplikuar kuponin.</summary>
    public decimal? MinOrderAmount { get; set; }
    public int? MaxUses { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public int UsesCount { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }

    public ICollection<OrderCoupon> OrderCoupons { get; set; } = new List<OrderCoupon>();
    public ICollection<CouponAudit> Audits { get; set; } = new List<CouponAudit>();
}
