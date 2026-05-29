using FoodDelivery.Application.Notifications;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Notifications;

public sealed class NotificationPublisher : INotificationPublisher
{
    private readonly FoodDeliveryDbContext _db;
    private readonly IHubContext<OrderTrackingHub> _hub;
    private readonly ILogger<NotificationPublisher> _log;

    public NotificationPublisher(FoodDeliveryDbContext db, IHubContext<OrderTrackingHub> hub, ILogger<NotificationPublisher> log)
    {
        _db = db;
        _hub = hub;
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

            var isAdminNotif = names.Any(n =>
                n.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                || n.Equals("Support", StringComparison.OrdinalIgnoreCase));

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

            try
            {
                await _db.SaveChangesAsync(cancellationToken);
            }
            catch (Exception dbEx)
            {
                _log.LogWarning(dbEx, "Ruajtja e njoftimit në DB dështoi për rolet [{Roles}].", string.Join(", ", roleNames));
            }

            if (isAdminNotif)
            {
                var linkPath = NotificationTypes.AdminLinkPath(type);
                var payload = new { title = title.Trim(), message = message.Trim(), type, createdAtUtc = now, linkPath };
                _log.LogInformation("Dërgoj adminNotification SignalR te {Count} admin(s) për tipin '{Type}'.", userIds.Count, type);
                foreach (var userId in userIds)
                {
                    try
                    {
                        await _hub.Clients.Group($"admin-{userId}")
                            .SendAsync("adminNotification", payload, cancellationToken);
                    }
                    catch (Exception hubEx)
                    {
                        _log.LogWarning(hubEx, "SignalR adminNotification për admin-{UserId} dështoi.", userId);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Njoftimi për rolet [{Roles}] nuk u ruajt.", string.Join(", ", roleNames));
        }
    }
}
