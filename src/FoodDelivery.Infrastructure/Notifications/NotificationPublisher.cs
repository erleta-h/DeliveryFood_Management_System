using FoodDelivery.Application.Notifications;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Notifications;

public sealed class NotificationPublisher : INotificationPublisher
{
    private readonly FoodDeliveryDbContext _db;
    private readonly ILogger<NotificationPublisher> _log;

    public NotificationPublisher(FoodDeliveryDbContext db, ILogger<NotificationPublisher> log)
    {
        _db = db;
        _log = log;
    }

    public async Task NotifyUsersInRolesAsync(
        IReadOnlyList<string> roleNames,
        string title,
        string message,
        string type,
        CancellationToken cancellationToken = default)
    {
        if (roleNames.Count == 0)
            return;

        try
        {
            var names = roleNames
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Select(n => n.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (names.Count == 0)
                return;

            var userIds = await (
                from ur in _db.UserRoles.AsNoTracking()
                join r in _db.Roles.AsNoTracking() on ur.RoleId equals r.Id
                where names.Contains(r.Name)
                select ur.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (userIds.Count == 0)
                return;

            var now = DateTime.UtcNow;
            foreach (var userId in userIds)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Title = title.Trim(),
                    Message = message.Trim(),
                    Type = type.Trim(),
                    IsRead = false,
                    CreatedAt = now,
                });
            }

            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Njoftimi për rolet [{Roles}] nuk u ruajt.", string.Join(", ", roleNames));
        }
    }
}
