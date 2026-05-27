using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Support;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Support;

public sealed class SupportTicketService : ISupportTicketService
{
    private static readonly string[] AdminNotifyRoles = ["Admin", "Support"];

    private readonly IUnitOfWork _uow;
    private readonly INotificationPublisher _notifications;
    private readonly IHubContext<OrderTrackingHub> _hub;
    private readonly ILogger<SupportTicketService> _log;

    public SupportTicketService(IUnitOfWork uow, INotificationPublisher notifications,
        IHubContext<OrderTrackingHub> hub, ILogger<SupportTicketService> log)
    {
        _uow = uow;
        _notifications = notifications;
        _hub = hub;
        _log = log;
    }

    public async Task<(long? Id, string? Error)> CreateAsync(
        long userId,
        CreateSupportTicketRequest request,
        CancellationToken cancellationToken = default)
    {
        var subject = request.Subject.Trim();
        var body = request.Body.Trim();
        if (subject.Length is < 1 or > 200)
            return (null, "Titulli: 1–200 karaktere.");
        if (body.Length is < 1 or > 4000)
            return (null, "Mesazhi: 1–4000 karaktere.");
        if (!SupportTicketCategory.IsValid(request.Category))
            return (null, "Kategoria e pavlefshme.");

        long? orderId = request.OrderId;
        long? restaurantId = request.RestaurantId;
        long? driverId = null;

        if (orderId is { } oid)
        {
            var order = await _uow.Repository<Order, long>().Query.AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == oid, cancellationToken);
            if (order is null)
                return (null, "Porosia nuk u gjet.");
            restaurantId ??= order.RestaurantId;

            var delivery = await _uow.Repository<Delivery, long>().Query.AsNoTracking()
                .FirstOrDefaultAsync(d => d.OrderId == oid, cancellationToken);
            driverId = delivery?.DriverUserId;
        }
        else if (restaurantId is { } restId)
        {
            var exists = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
                .AnyAsync(r => r.Id == restId, cancellationToken);
            if (!exists)
                return (null, "Restoranti nuk u gjet.");
        }

        var now = DateTime.UtcNow;
        var priority = SupportTicketPriority.AutoFromCategory(request.Category);

        var t = new SupportTicket
        {
            UserId = userId,
            Subject = subject,
            Body = body,
            Status = SupportTicketStatus.Open,
            Category = request.Category,
            Priority = priority,
            CreatedAt = now,
            OrderId = orderId,
            RestaurantId = restaurantId,
            DriverId = driverId,
        };
        _uow.Repository<SupportTicket, long>().Add(t);
        await _uow.SaveChangesAsync(cancellationToken);

        await _notifications.NotifyUsersInRolesAsync(
            AdminNotifyRoles,
            "Tiketë support e re",
            $"[{SupportTicketCategory.Labels.GetValueOrDefault(request.Category, "?")}] {subject}",
            NotificationTypes.SupportTicketNew,
            cancellationToken);

        return (t.Id, null);
    }

    public async Task<IReadOnlyList<SupportTicketMineItemDto>> ListMineAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<SupportTicket, long>().Query.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new SupportTicketMineItemDto(
                x.Id,
                x.Subject,
                x.Status,
                x.Category,
                x.Priority,
                x.CreatedAt,
                x.UpdatedAt,
                x.ResolvedAt,
                1 + x.Messages.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<SupportTicketThreadDto?> GetThreadAsync(
        long userId,
        long ticketId,
        CancellationToken cancellationToken = default)
    {
        var t = await _uow.Repository<SupportTicket, long>().Query
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Messages).ThenInclude(m => m.Author)
            .Include(x => x.Order)
            .Include(x => x.Restaurant)
            .Include(x => x.Driver)
            .Include(x => x.AssignedTo)
            .FirstOrDefaultAsync(x => x.Id == ticketId && x.UserId == userId, cancellationToken);
        return t is null ? null : MapThread(t);
    }

    public async Task<string?> PostCustomerMessageAsync(
        long userId,
        long ticketId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var trimmed = body.Trim();
        if (trimmed.Length is < 1 or > 4000)
            return "Mesazhi: 1–4000 karaktere.";

        var t = await _uow.Repository<SupportTicket, long>().Query
            .FirstOrDefaultAsync(x => x.Id == ticketId && x.UserId == userId, cancellationToken);
        if (t is null)
            return "Tiketa nuk u gjet.";
        if (t.Status == SupportTicketStatus.Closed)
            return "Tiketa është e mbyllur.";

        var now = DateTime.UtcNow;
        _uow.Repository<SupportTicketMessage, long>().Add(new SupportTicketMessage
        {
            SupportTicketId = ticketId,
            AuthorUserId = userId,
            Body = trimmed,
            IsStaffReply = false,
            CreatedAt = now,
        });
        t.UpdatedAt = now;
        await _uow.SaveChangesAsync(cancellationToken);

        try
        {
            var userEmail = await _uow.Repository<User, long>().Query.AsNoTracking()
                .Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefaultAsync(cancellationToken);
            var preview = trimmed.Length > 80 ? trimmed[..80] + "…" : trimmed;
            var adminPayload = new
            {
                title = "Përgjigje nga klienti",
                message = $"{t.Subject}: {preview}",
                type = "support_client_reply",
                ticketId,
                createdAtUtc = now,
                linkPath = "/admin/support",
            };

            var adminUserIds = await (
                from ur in _uow.Repository<UserRole, long>().Query.AsNoTracking()
                join r in _uow.Repository<Role, long>().Query.AsNoTracking() on ur.RoleId equals r.Id
                where r.Name == "Admin" || r.Name == "Support"
                select ur.UserId)
                .Distinct().ToListAsync(cancellationToken);

            _log.LogInformation("Dërgoj adminNotification për tiketë {TicketId} te {Count} admin(s): [{Ids}]",
                ticketId, adminUserIds.Count, string.Join(",", adminUserIds));
            foreach (var aid in adminUserIds)
            {
                try { await _hub.Clients.Group($"admin-{aid}").SendAsync("adminNotification", adminPayload, cancellationToken); }
                catch (Exception hubEx) { _log.LogWarning(hubEx, "SignalR adminNotif për admin-{Aid} dështoi.", aid); }
            }
        }
        catch (Exception ex) { _log.LogWarning(ex, "SignalR admin njoftim për tiketën {TicketId} dështoi.", ticketId); }

        return null;
    }

    internal static SupportTicketThreadDto MapThread(SupportTicket t)
    {
        var messages = t.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportTicketMessageDto(
                m.Id, m.AuthorUserId, m.Author.Email, m.IsStaffReply, m.Body, m.CreatedAt))
            .ToList();

        return new SupportTicketThreadDto(
            t.Id, t.UserId, t.User.Email, t.Subject, t.Body,
            t.Status, t.Category, t.Priority,
            t.CreatedAt, t.UpdatedAt, t.ResolvedAt, t.AdminNote,
            t.OrderId, t.Order?.OrderNumber,
            t.RestaurantId, t.Restaurant?.Name,
            t.DriverId, t.Driver != null ? $"{t.Driver.FirstName} {t.Driver.LastName}".Trim() : null,
            t.AssignedToUserId, t.AssignedTo?.Email,
            messages);
    }
}
