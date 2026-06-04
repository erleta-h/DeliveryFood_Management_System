using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Infrastructure.Drivers;

internal static class DriverApplicationAuditWriter
{
    internal static void Add(
        IUnitOfWork uow,
        long applicationId,
        string eventType,
        string? detail,
        long? actorUserId,
        DateTime utcNow)
    {
        uow.Repository<DriverApplicationAudit, long>().Add(new DriverApplicationAudit
        {
            DriverApplicationId = applicationId,
            EventType = eventType,
            Detail = detail,
            CreatedAtUtc = utcNow,
            CreatedByUserId = actorUserId,
        });
    }
}
