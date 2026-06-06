using FoodDelivery.Application.Admin;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminCustomersService : IAdminCustomersService
{
    private const int MaxPageSize = 100;

    private readonly FoodDeliveryDbContext _db;

    public AdminCustomersService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminCustomerStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var customerRoleId = await GetCustomerRoleIdAsync(cancellationToken);
        if (customerRoleId == 0)
            return new AdminCustomerStatsDto(0, 0, 0, 0, 0, 0);

        var weekStart = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + (int)DayOfWeek.Monday);
        if (DateTime.UtcNow.DayOfWeek == DayOfWeek.Sunday)
            weekStart = weekStart.AddDays(-7);

        var customers = _db.Users.AsNoTracking()
            .Where(u => _db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == customerRoleId));

        var total = await customers.CountAsync(cancellationToken);
        var active = await customers.CountAsync(u => u.IsActive, cancellationToken);
        var blocked = total - active;
        var totalAddresses = await _db.CustomerAddresses.AsNoTracking()
            .CountAsync(a => _db.UserRoles.Any(ur => ur.UserId == a.UserId && ur.RoleId == customerRoleId), cancellationToken);
        var newThisWeek = await customers.CountAsync(u => u.CreatedAt >= weekStart, cancellationToken);
        var newAddressesThisWeek = await _db.CustomerAddresses.AsNoTracking()
            .CountAsync(
                a => a.CreatedAt >= weekStart &&
                     _db.UserRoles.Any(ur => ur.UserId == a.UserId && ur.RoleId == customerRoleId),
                cancellationToken);

        return new AdminCustomerStatsDto(total, active, blocked, totalAddresses, newThisWeek, newAddressesThisWeek);
    }

    public async Task<AdminCustomerListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        string? sort,
        DateTime? registeredFromUtc,
        DateTime? registeredToUtc,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var customerRoleId = await GetCustomerRoleIdAsync(cancellationToken);
        if (customerRoleId == 0)
            return new AdminCustomerListResultDto(Array.Empty<AdminCustomerListItemDto>(), 0, p, ps);

        var baseUsers = _db.Users
            .AsNoTracking()
            .Where(u => _db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == customerRoleId));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            baseUsers = baseUsers.Where(u =>
                u.Email.Contains(s) ||
                u.FirstName.Contains(s) ||
                u.LastName.Contains(s) ||
                (u.Phone != null && u.Phone.Contains(s)));
        }

        var statusKey = (status ?? "all").Trim().ToLowerInvariant();
        if (statusKey == "active")
            baseUsers = baseUsers.Where(u => u.IsActive);
        else if (statusKey == "blocked")
            baseUsers = baseUsers.Where(u => !u.IsActive);

        if (registeredFromUtc.HasValue)
            baseUsers = baseUsers.Where(u => u.CreatedAt >= registeredFromUtc.Value);
        if (registeredToUtc.HasValue)
            baseUsers = baseUsers.Where(u => u.CreatedAt <= registeredToUtc.Value);

        var total = await baseUsers.CountAsync(cancellationToken);
        var sorted = ApplyCustomerSort(baseUsers, sort);
        var pageUsers = await sorted
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Phone,
                u.IsActive,
                u.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        var userIds = pageUsers.Select(u => u.Id).ToList();
        var addressCounts = await _db.CustomerAddresses.AsNoTracking()
            .Where(a => userIds.Contains(a.UserId))
            .GroupBy(a => a.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, cancellationToken);

        var orderCounts = await _db.Orders.AsNoTracking()
            .Where(o => userIds.Contains(o.UserId))
            .GroupBy(o => o.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, cancellationToken);

        var lastOrders = await (
            from o in _db.Orders.AsNoTracking()
            where userIds.Contains(o.UserId)
            group o by o.UserId into g
            select new
            {
                UserId = g.Key,
                Last = g.OrderByDescending(x => x.PlacedAt).Select(x => new { x.PlacedAt, RestaurantName = x.Restaurant.Name }).First(),
            })
            .ToDictionaryAsync(x => x.UserId, x => x.Last, cancellationToken);

        var items = pageUsers.Select(u =>
        {
            lastOrders.TryGetValue(u.Id, out var last);
            return new AdminCustomerListItemDto(
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Phone,
                u.IsActive,
                addressCounts.GetValueOrDefault(u.Id),
                orderCounts.GetValueOrDefault(u.Id),
                u.CreatedAt,
                last?.PlacedAt,
                last?.RestaurantName);
        }).ToList();

        return new AdminCustomerListResultDto(items, total, p, ps);
    }

    private IOrderedQueryable<Domain.Entities.User> ApplyCustomerSort(IQueryable<Domain.Entities.User> q, string? sort)
    {
        var key = (sort ?? "created_desc").Trim().ToLowerInvariant();
        return key switch
        {
            "email_asc" => q.OrderBy(u => u.Email),
            "email_desc" => q.OrderByDescending(u => u.Email),
            "name_asc" => q.OrderBy(u => u.FirstName).ThenBy(u => u.LastName).ThenBy(u => u.Email),
            "name_desc" => q.OrderByDescending(u => u.FirstName).ThenByDescending(u => u.LastName),
            "orders_desc" => q.OrderByDescending(u => _db.Orders.Count(o => o.UserId == u.Id)),
            "created_asc" => q.OrderBy(u => u.CreatedAt),
            _ => q.OrderByDescending(u => u.CreatedAt),
        };
    }

    private async Task<long> GetCustomerRoleIdAsync(CancellationToken cancellationToken)
    {
        return await _db.Roles
            .AsNoTracking()
            .Where(r => r.Name == DbSeeder.CustomerRoleName)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<string?> SetActiveAsync(long userId, bool isActive, CancellationToken cancellationToken = default)
    {
        var customerRoleId = await GetCustomerRoleIdAsync(cancellationToken);
        if (customerRoleId == 0)
            return "Roli Customer mungon.";

        var hasRole = await _db.UserRoles.AnyAsync(
            ur => ur.UserId == userId && ur.RoleId == customerRoleId,
            cancellationToken);
        if (!hasRole)
            return "Përdoruesi nuk është klient.";

        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (u is null)
            return "Përdoruesi nuk u gjet.";

        u.IsActive = isActive;
        u.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }
}
