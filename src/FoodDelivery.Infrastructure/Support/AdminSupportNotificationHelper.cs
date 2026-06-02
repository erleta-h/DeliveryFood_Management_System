using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Support;

/// <summary>Njoftime admin (DB + SignalR) për tiketat e support-it.</summary>
internal static class AdminSupportNotificationHelper
{
    private static readonly string[] AdminRoles = ["Admin", "Support"];

    public static async Task NotifyAdminsAsync(
        IUnitOfWork uow,
        IHubContext<OrderTrackingHub> hub,
        ILogger log,
        long ticketId,
        string title,
        string message,
        string notificationType,
        CancellationToken cancellationToken)
    {
        var adminUserIds = await (
            from ur in uow.Repository<UserRole, long>().Query.AsNoTracking()
            join r in uow.Repository<Role, long>().Query.AsNoTracking() on ur.RoleId equals r.Id
            where AdminRoles.Contains(r.Name)
            select ur.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (adminUserIds.Count == 0)
            return;

        var storedType = NotificationTypes.EncodeWithTicket(notificationType, ticketId);
        var linkPath = NotificationTypes.AdminLinkPath(storedType);
        var now = DateTime.UtcNow;

        var saved = new List<Notification>();
        foreach (var aid in adminUserIds)
        {
            var row = new Notification
            {
                UserId = aid,
                Title = title.Trim(),
                Message = message.Trim(),
                Type = storedType,
                IsRead = false,
                CreatedAt = now,
            };
            uow.Repository<Notification, long>().Add(row);
            saved.Add(row);
        }

        try
        {
            await uow.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Ruajtja e njoftimeve admin për tiketën {TicketId} dështoi.", ticketId);
            saved.Clear();
        }

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
                await hub.Clients.Group($"admin-{row.UserId}")
                    .SendAsync("adminNotification", payload, cancellationToken);
            }
            catch (Exception hubEx)
            {
                log.LogWarning(hubEx, "SignalR adminNotification për admin-{Aid} dështoi.", row.UserId);
            }
        }

        if (saved.Count == 0)
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
            foreach (var aid in adminUserIds)
            {
                try
                {
                    await hub.Clients.Group($"admin-{aid}")
                        .SendAsync("adminNotification", fallback, cancellationToken);
                }
                catch (Exception hubEx)
                {
                    log.LogWarning(hubEx, "SignalR adminNotification (fallback) për admin-{Aid} dështoi.", aid);
                }
            }
        }
    }
}
