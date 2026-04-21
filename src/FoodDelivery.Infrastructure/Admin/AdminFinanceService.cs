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
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _db.Payments.AsNoTracking();
        if (fromUtc is { } f)
            q = q.Where(x => x.CreatedAt >= f);
        if (toUtc is { } t)
            q = q.Where(x => x.CreatedAt <= t);

        var sumCaptured = await q
            .Where(x => x.Status == PaymentStatus.Captured)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Join(
                _db.Orders.AsNoTracking(),
                pay => pay.OrderId,
                ord => ord.Id,
                (pay, ord) => new AdminPaymentListItemDto(
                    pay.Id,
                    ord.OrderNumber,
                    pay.Amount,
                    pay.Currency,
                    pay.Status,
                    pay.Provider,
                    pay.CreatedAt))
            .ToListAsync(cancellationToken);

        return new AdminPaymentListResultDto(items, total, p, ps, sumCaptured);
    }
}
