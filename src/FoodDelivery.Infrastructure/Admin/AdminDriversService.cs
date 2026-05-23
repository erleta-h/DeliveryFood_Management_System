using FoodDelivery.Application.Admin;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminDriversService : IAdminDriversService
{
    private const int MaxPageSize = 100;

    private readonly FoodDeliveryDbContext _db;

    public AdminDriversService(FoodDeliveryDbContext db) => _db = db;

    public async Task<AdminDriverListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q =
            from d in _db.DriverProfiles.AsNoTracking()
            join u in _db.Users.AsNoTracking() on d.UserId equals u.Id
            select new { d, u };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            q = q.Where(x =>
                x.u.Email.Contains(term)
                || x.u.FirstName.Contains(term)
                || x.u.LastName.Contains(term)
                || (x.d.LicensePlate != null && x.d.LicensePlate.Contains(term)));
        }

        var statusKey = status?.Trim().ToLowerInvariant();
        q = statusKey switch
        {
            "active" => q.Where(x => x.u.IsActive),
            "suspended" => q.Where(x => !x.u.IsActive),
            "online" => q.Where(x => x.d.IsOnline && x.u.IsActive),
            _ => q,
        };

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderBy(x => x.u.Email)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(x => new AdminDriverListItemDto(
                x.d.UserId,
                x.u.Email,
                x.u.FirstName,
                x.u.LastName,
                x.u.IsActive,
                x.d.VehicleType,
                x.d.LicensePlate,
                x.d.IsOnline,
                x.d.LastLatitude,
                x.d.LastLongitude,
                x.d.LastLocationAtUtc,
                x.d.CreatedAt))
            .ToListAsync(cancellationToken);

        return new AdminDriverListResultDto(items, total, p, ps);
    }

    public async Task<string?> PatchAsync(
        long userId,
        AdminDriverPatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var profile = await _db.DriverProfiles
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.UserId == userId, cancellationToken);
        if (profile is null)
            return "Profili i deliverit nuk u gjet.";

        if (request.UserIsActive is { } ua)
            profile.User.IsActive = ua;

        if (request.IsOnline is { } online)
            profile.IsOnline = online;

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }
}
