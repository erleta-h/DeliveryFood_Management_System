using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class CouponAuditWriter
{
    private readonly FoodDeliveryDbContext _db;

    public CouponAuditWriter(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public void Add(long couponId, string eventType, string? detail, long? adminUserId, DateTime nowUtc)
    {
        _db.CouponAudits.Add(new CouponAudit
        {
            CouponId = couponId,
            EventType = eventType,
            Detail = detail,
            CreatedAtUtc = nowUtc,
            CreatedByUserId = adminUserId,
        });
    }
}
