using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Notifications;

public sealed class CustomerNotificationService : ICustomerNotificationService
{
    private readonly IUnitOfWork _uow;

    public CustomerNotificationService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<CustomerNotificationRowDto>> ListAsync(
        long userId,
        int take,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 50);
        return await _uow.Repository<Notification, long>().Query
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .Select(n => new CustomerNotificationRowDto(
                n.Id,
                n.Title,
                n.Message,
                n.Type,
                n.CreatedAt,
                n.IsRead))
            .ToListAsync(cancellationToken);
    }

    public async Task<int> UnreadCountAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<Notification, long>().Query
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
    }

    public async Task<string?> MarkReadAsync(
        long userId,
        long notificationId,
        CancellationToken cancellationToken = default)
    {
        var n = await _uow.Repository<Notification, long>().Query
            .FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId, cancellationToken);
        if (n is null)
            return "Njoftimi nuk u gjet.";

        if (!n.IsRead)
        {
            var now = DateTime.UtcNow;
            n.IsRead = true;
            n.UpdatedAt = now;
            await _uow.SaveChangesAsync(cancellationToken);
        }

        return null;
    }

    public async Task MarkAllReadAsync(long userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var list = await _uow.Repository<Notification, long>().Query
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);
        foreach (var n in list)
        {
            n.IsRead = true;
            n.UpdatedAt = now;
        }

        if (list.Count > 0)
            await _uow.SaveChangesAsync(cancellationToken);
    }
}
