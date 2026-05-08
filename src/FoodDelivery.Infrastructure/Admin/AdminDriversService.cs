using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminDriversService : IAdminDriversService
{
    private const int MaxPageSize = 100;

    private readonly IUnitOfWork _uow;

    public AdminDriversService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<AdminDriverListResultDto> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _uow.Repository<DriverProfile, long>().Query.AsNoTracking();
        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderBy(d => d.User.Email)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(d => new AdminDriverListItemDto(
                d.UserId,
                d.User.Email,
                d.User.FirstName,
                d.User.LastName,
                d.User.IsActive,
                d.VehicleType,
                d.LicensePlate,
                d.IsOnline,
                d.LastLatitude,
                d.LastLongitude,
                d.LastLocationAtUtc,
                d.CreatedAt))
            .ToListAsync(cancellationToken);

        return new AdminDriverListResultDto(items, total, p, ps);
    }

    public async Task<string?> PatchAsync(
        long userId,
        AdminDriverPatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var profile = await _uow.Repository<DriverProfile, long>().Query
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.UserId == userId, cancellationToken);
        if (profile is null)
            return "Profili i deliverit nuk u gjet.";

        if (request.UserIsActive is { } ua)
            profile.User.IsActive = ua;
        if (request.IsOnline is { } io)
            profile.IsOnline = io;

        profile.UpdatedAt = DateTime.UtcNow;
        profile.User.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }
}
