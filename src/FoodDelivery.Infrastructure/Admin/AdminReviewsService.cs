using FoodDelivery.Application.Admin;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminReviewsService : IAdminReviewsService
{
    private const int MaxPageSize = 100;

    private readonly FoodDeliveryDbContext _db;

    public AdminReviewsService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminReviewListResultDto> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _db.Reviews.AsNoTracking();
        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(r => new AdminReviewListItemDto(
                r.Id,
                r.OrderId,
                r.Order.OrderNumber,
                r.Rating,
                r.Subject,
                r.Comment,
                r.CreatedAt,
                r.Author.Email,
                r.Restaurant != null ? r.Restaurant.Name : null))
            .ToListAsync(cancellationToken);

        return new AdminReviewListResultDto(items, total, p, ps);
    }

    public async Task<string?> DeleteAsync(long reviewId, CancellationToken cancellationToken = default)
    {
        var r = await _db.Reviews.FirstOrDefaultAsync(x => x.Id == reviewId, cancellationToken);
        if (r is null)
            return "Vlerësimi nuk u gjet.";

        _db.Reviews.Remove(r);
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }
}
