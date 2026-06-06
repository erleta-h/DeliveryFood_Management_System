using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Orders;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminFinanceService : IAdminFinanceService
{
    private const int MaxPageSize = 100;

    private readonly FoodDeliveryDbContext _db;

    public AdminFinanceService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminPaymentListResultDto> ListPaymentsAsync(
        int page,
        int pageSize,
        DateTime? fromUtc,
        DateTime? toUtc,
        int? status,
        string? provider,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        IQueryable<Domain.Entities.Payment> q = _db.Payments.AsNoTracking();
        if (fromUtc is { } f)
            q = q.Where(x => x.CreatedAt >= f);
        if (toUtc is { } t)
            q = q.Where(x => x.CreatedAt <= t);
        if (status is { } st)
            q = q.Where(x => x.Status == st);
        if (!string.IsNullOrWhiteSpace(provider))
        {
            var prov = provider.Trim().ToLowerInvariant();
            q = q.Where(x => x.Provider.ToLower() == prov);
        }

        var sumCaptured = await q
            .Where(x => x.Status == PaymentStatus.Captured)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
        var sumPending = await q
            .Where(x => x.Status == PaymentStatus.Pending)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
        var sumRefunded = await q
            .Where(x => x.Status == PaymentStatus.Refunded)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
        var pendingCount = await q.CountAsync(x => x.Status == PaymentStatus.Pending, cancellationToken);
        var refundedCount = await q.CountAsync(x => x.Status == PaymentStatus.Refunded, cancellationToken);

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Join(
                _db.Orders.AsNoTracking(),
                pay => pay.OrderId,
                ord => ord.Id,
                (pay, ord) => new { pay, ord })
            .Join(
                _db.Restaurants.AsNoTracking(),
                x => x.ord.RestaurantId,
                r => r.Id,
                (x, r) => new { x.pay, x.ord, r })
            .Join(
                _db.Users.AsNoTracking(),
                x => x.ord.UserId,
                u => u.Id,
                (x, u) => new AdminPaymentListItemDto(
                    x.pay.Id,
                    x.ord.Id,
                    x.ord.OrderNumber,
                    x.r.Name,
                    u.Email,
                    BuildCustomerName(u.FirstName, u.LastName),
                    x.pay.Amount,
                    x.pay.Currency,
                    x.pay.Status,
                    x.pay.Provider,
                    x.pay.CreatedAt))
            .ToListAsync(cancellationToken);

        return new AdminPaymentListResultDto(
            items,
            total,
            p,
            ps,
            sumCaptured,
            sumPending,
            sumRefunded,
            pendingCount,
            refundedCount);
    }

    private static string? BuildCustomerName(string firstName, string lastName)
    {
        var name = $"{firstName} {lastName}".Trim();
        return string.IsNullOrEmpty(name) ? null : name;
    }
}
