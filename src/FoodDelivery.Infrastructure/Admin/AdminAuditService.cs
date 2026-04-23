using FoodDelivery.Application.Admin;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminAuditService : IAdminAuditService
{
    private const int MaxPageSize = 200;

    private readonly FoodDeliveryDbContext _db;

    public AdminAuditService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminAuditLogListResultDto> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _db.AuditLogs.AsNoTracking();
        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(a => new AdminAuditLogItemDto(
                a.Id,
                a.CreatedAt,
                a.UserId,
                a.User != null ? a.User.Email : null,
                a.Action,
                a.Entity,
                a.EntityId,
                a.IpAddress))
            .ToListAsync(cancellationToken);

        return new AdminAuditLogListResultDto(items, total, p, ps);
    }
}
