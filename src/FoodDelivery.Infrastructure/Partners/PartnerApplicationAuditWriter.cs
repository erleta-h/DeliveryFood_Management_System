using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;

namespace FoodDelivery.Infrastructure.Partners;

internal static class PartnerApplicationAuditWriter
{
    internal static void Add(
        FoodDeliveryDbContext db,
        long applicationId,
        string eventType,
        string? detail,
        long? actorUserId,
        DateTime utcNow)
    {
        db.PartnerApplicationAudits.Add(new PartnerApplicationAudit
        {
            PartnerApplicationId = applicationId,
            EventType = eventType,
            Detail = detail,
            CreatedAtUtc = utcNow,
            CreatedByUserId = actorUserId,
        });
    }
}
