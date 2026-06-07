using FoodDelivery.Application.Admin;
using FoodDelivery.Domain.Entities;
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

    public async Task<AdminReviewStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var q = _db.Reviews.AsNoTracking();
        var total = await q.CountAsync(cancellationToken);
        var avg = total > 0
            ? (decimal)await q.AverageAsync(r => (double)r.Rating, cancellationToken)
            : 0m;
        var reported = await q.CountAsync(r => r.Status == ReviewModerationStatus.Reported, cancellationToken);
        var hidden = await q.CountAsync(r => r.Status == ReviewModerationStatus.Hidden, cancellationToken);

        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);

        var totalThisMonth = await q.CountAsync(r => r.CreatedAt >= thisMonthStart, cancellationToken);
        var totalLastMonth = await q.CountAsync(
            r => r.CreatedAt >= lastMonthStart && r.CreatedAt < thisMonthStart,
            cancellationToken);

        int? totalChangePercent = null;
        if (totalLastMonth > 0)
            totalChangePercent = (int)Math.Round((totalThisMonth - totalLastMonth) * 100m / totalLastMonth);

        var avgThisMonth = await AverageRatingSinceAsync(q, thisMonthStart, cancellationToken);
        var avgLastMonth = await AverageRatingSinceAsync(q, lastMonthStart, thisMonthStart, cancellationToken);
        var avgChange = Math.Round(avgThisMonth - avgLastMonth, 1);

        var reportedThisMonth = await q.CountAsync(
            r => r.Status == ReviewModerationStatus.Reported && r.CreatedAt >= thisMonthStart,
            cancellationToken);
        var reportedLastMonth = await q.CountAsync(
            r => r.Status == ReviewModerationStatus.Reported &&
                 r.CreatedAt >= lastMonthStart &&
                 r.CreatedAt < thisMonthStart,
            cancellationToken);

        var hiddenThisMonth = await q.CountAsync(
            r => r.Status == ReviewModerationStatus.Hidden && r.CreatedAt >= thisMonthStart,
            cancellationToken);
        var hiddenLastMonth = await q.CountAsync(
            r => r.Status == ReviewModerationStatus.Hidden &&
                 r.CreatedAt >= lastMonthStart &&
                 r.CreatedAt < thisMonthStart,
            cancellationToken);

        return new AdminReviewStatsDto(
            total,
            total > 0 ? Math.Round(avg, 1) : 0m,
            reported,
            hidden,
            totalChangePercent,
            avgChange,
            reportedThisMonth - reportedLastMonth,
            hiddenThisMonth - hiddenLastMonth);
    }

    private static async Task<decimal> AverageRatingSinceAsync(
        IQueryable<Review> q,
        DateTime from,
        CancellationToken cancellationToken)
    {
        var slice = q.Where(r => r.CreatedAt >= from);
        var count = await slice.CountAsync(cancellationToken);
        if (count == 0) return 0m;
        return (decimal)await slice.AverageAsync(r => (double)r.Rating, cancellationToken);
    }

    private static async Task<decimal> AverageRatingSinceAsync(
        IQueryable<Review> q,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken)
    {
        var slice = q.Where(r => r.CreatedAt >= from && r.CreatedAt < to);
        var count = await slice.CountAsync(cancellationToken);
        if (count == 0) return 0m;
        return (decimal)await slice.AverageAsync(r => (double)r.Rating, cancellationToken);
    }

    public async Task<AdminReviewListResultDto> ListAsync(
        AdminReviewListQuery query,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, query.Page);
        var ps = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var q = _db.Reviews.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(r =>
                r.Order.OrderNumber.Contains(s) ||
                r.Author.Email.Contains(s) ||
                (r.Restaurant != null && r.Restaurant.Name.Contains(s)) ||
                (r.Driver != null &&
                 (r.Driver.FirstName + " " + r.Driver.LastName).Contains(s)) ||
                (r.Comment != null && r.Comment.Contains(s)));
        }

        if (query.Status is int status)
            q = q.Where(r => r.Status == status);

        if (query.Subject is int subject)
            q = q.Where(r => r.Subject == subject);

        if (query.Rating is int rating)
            q = q.Where(r => r.Rating == rating);

        if (query.FromUtc is DateTime from)
            q = q.Where(r => r.CreatedAt >= from);

        if (query.ToUtc is DateTime to)
            q = q.Where(r => r.CreatedAt <= to);

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
                r.Restaurant != null ? r.Restaurant.Name : null,
                r.Restaurant != null ? r.Restaurant.City : null,
                r.Driver != null
                    ? (r.Driver.FirstName + " " + r.Driver.LastName).Trim()
                    : null,
                r.Status,
                r.ReportCount))
            .ToListAsync(cancellationToken);

        return new AdminReviewListResultDto(items, total, p, ps);
    }

    public async Task<string?> SetStatusAsync(
        long reviewId,
        int status,
        long? adminUserId,
        CancellationToken cancellationToken = default)
    {
        if (status is not (
            ReviewModerationStatus.Public or
            ReviewModerationStatus.Hidden or
            ReviewModerationStatus.Reported))
            return "Status i pavlefshëm.";

        var r = await _db.Reviews.FirstOrDefaultAsync(x => x.Id == reviewId, cancellationToken);
        if (r is null)
            return "Vlerësimi nuk u gjet.";

        r.Status = status;
        r.UpdatedAt = DateTime.UtcNow;
        r.UpdatedById = adminUserId;
        await _db.SaveChangesAsync(cancellationToken);
        return null;
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
