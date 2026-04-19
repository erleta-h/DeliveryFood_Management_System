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

    public async Task<AdminCustomerListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var customerRoleId = await _db.Roles
            .AsNoTracking()
            .Where(r => r.Name == DbSeeder.CustomerRoleName)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);
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

        var total = await baseUsers.CountAsync(cancellationToken);
        var items = await baseUsers
            .OrderBy(u => u.Email)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(u => new AdminCustomerListItemDto(
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Phone,
                u.IsActive,
                _db.CustomerAddresses.Count(a => a.UserId == u.Id),
                _db.Orders.Count(o => o.UserId == u.Id)))
            .ToListAsync(cancellationToken);

        return new AdminCustomerListResultDto(items, total, p, ps);
    }

    public async Task<string?> SetActiveAsync(long userId, bool isActive, CancellationToken cancellationToken = default)
    {
        var customerRoleId = await _db.Roles
            .AsNoTracking()
            .Where(r => r.Name == DbSeeder.CustomerRoleName)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);
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
