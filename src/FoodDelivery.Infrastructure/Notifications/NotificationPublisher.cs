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
            var storedType = type.Trim();
            var saved = new List<Notification>();
            foreach (var userId in userIds)
            {
                var row = new Notification
                {
                    UserId = userId,
                    Title = title.Trim(),
                    Message = message.Trim(),
                    Type = storedType,
                    IsRead = false,
                    CreatedAt = now,
                };
                _db.Notifications.Add(row);
                saved.Add(row);
            }

            try
            {
                await _db.SaveChangesAsync(cancellationToken);
            }
            catch (Exception dbEx)
            {
                _log.LogWarning(dbEx, "Ruajtja e njoftimit në DB dështoi për rolet [{Roles}].", string.Join(", ", roleNames));
                saved.Clear();
            }

            if (isAdminNotif)
            {
                var linkPath = NotificationTypes.AdminLinkPath(storedType);
                var ticketId = NotificationTypes.TicketIdFromType(storedType);
                _log.LogInformation("Dërgoj adminNotification SignalR te {Count} admin(s) për tipin '{Type}'.", userIds.Count, storedType);

                if (saved.Count > 0)
                {
                    foreach (var row in saved)
                    {
                        var payload = new
                        {
                            id = row.Id,
                            title = row.Title,
                            message = row.Message,
                            type = row.Type,
                            ticketId,
                            createdAtUtc = now,
                            linkPath,
                        };
                        try
                        {
                            await _hub.Clients.Group($"admin-{row.UserId}")
                                .SendAsync("adminNotification", payload, cancellationToken);
                        }
                        catch (Exception hubEx)
                        {
                            _log.LogWarning(hubEx, "SignalR adminNotification për admin-{UserId} dështoi.", row.UserId);
                        }
                    }
                }
                else
                {
                    var fallback = new
                    {
                        id = 0L,
                        title = title.Trim(),
                        message = message.Trim(),
                        type = storedType,
                        ticketId,
                        createdAtUtc = now,
                        linkPath,
                    };
                    foreach (var userId in userIds)
                    {
                        try
                        {
                            await _hub.Clients.Group($"admin-{userId}")
                                .SendAsync("adminNotification", fallback, cancellationToken);
                        }
                        catch (Exception hubEx)
                        {
                            _log.LogWarning(hubEx, "SignalR adminNotification për admin-{UserId} dështoi.", userId);
                        }
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
