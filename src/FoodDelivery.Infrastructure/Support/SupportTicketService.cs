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
    private readonly IUnitOfWork _uow;
    private readonly IHubContext<OrderTrackingHub> _hub;
    private readonly ILogger<SupportTicketService> _log;

    public SupportTicketService(
        IUnitOfWork uow,
        IHubContext<OrderTrackingHub> hub,
        ILogger<SupportTicketService> log)
    {
        _uow = uow;
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

        var (orderId, restaurantId, driverId, orderErr) = await ResolveOrderLinkAsync(
            userId,
            request.OrderId,
            request.OrderNumber,
            request.RestaurantId,
            cancellationToken);
        if (orderErr is not null)
            return (null, orderErr);

        if (restaurantId is null)
        {
            var staffRestaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
                .Where(s => s.UserId == userId)
                .Select(s => (long?)s.RestaurantId)
                .FirstOrDefaultAsync(cancellationToken);
            if (staffRestaurantId is { } sr)
                restaurantId = sr;
        }

        if (orderId is null && restaurantId is { } restId)
        {
            var exists = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
                .AnyAsync(r => r.Id == restId, cancellationToken);
            if (!exists)
                return (null, "Restoranti nuk u gjet.");
        }

        var now = DateTime.UtcNow;
        var priority = request.Priority is { } p && SupportTicketPriority.IsValid(p)
            ? p
            : SupportTicketPriority.AutoFromCategory(request.Category);

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

        var creator = await _uow.Repository<User, long>().Query.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Email, u.FirstName, u.LastName })
            .FirstOrDefaultAsync(cancellationToken);
        string? restaurantName = null;
        if (restaurantId is { } rid)
        {
            restaurantName = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
                .Where(r => r.Id == rid)
                .Select(r => r.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var creatorLabel = !string.IsNullOrWhiteSpace(restaurantName)
            ? restaurantName.Trim()
            : creator is null
                ? "Përdorues"
                : $"{creator.FirstName} {creator.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(creatorLabel) && creator is not null)
            creatorLabel = creator.Email;

        _uow.Repository<SupportTicketAudit, long>().Add(new SupportTicketAudit
        {
            SupportTicketId = t.Id,
            ActorUserId = userId,
            Action = $"Tiketa u krijua nga {creatorLabel}",
            CreatedAt = now,
        });
        await _uow.SaveChangesAsync(cancellationToken);

        await AdminSupportNotificationHelper.NotifyAdminsAsync(
            _uow,
            _hub,
            _log,
            t.Id,
            "Tiketë support e re",
            $"[{SupportTicketCategory.Labels.GetValueOrDefault(request.Category, "?")}] {subject}",
            NotificationTypes.SupportTicketNew,
            cancellationToken);

        return (t.Id, null);
    }

    private async Task<(long? OrderId, long? RestaurantId, long? DriverId, string? Error)> ResolveOrderLinkAsync(
        long userId,
        long? orderId,
        string? orderNumber,
        long? restaurantId,
        CancellationToken cancellationToken)
    {
        long? resolvedOrderId = orderId is > 0 ? orderId : null;
        if (resolvedOrderId is null)
        {
            var refText = orderNumber?.Trim();
            if (!string.IsNullOrEmpty(refText))
            {
                resolvedOrderId = await _uow.Repository<Order, long>().Query.AsNoTracking()
                    .Where(o => o.OrderNumber == refText)
                    .Select(o => (long?)o.Id)
                    .FirstOrDefaultAsync(cancellationToken);
            }
        }

        // ID / nr. porosie është opsional — nëse nuk lidhet, tiketa krijohet pa OrderId.
        if (resolvedOrderId is not { } oid)
            return (null, restaurantId, null, null);

        var orderRow = await _uow.Repository<Order, long>().Query.AsNoTracking()
            .Where(o => o.Id == oid)
            .Select(o => new { o.RestaurantId, o.UserId })
            .FirstOrDefaultAsync(cancellationToken);
        if (orderRow is null)
            return (null, restaurantId, null, null);

        var canLink = orderRow.UserId == userId
            || await _uow.Repository<Delivery, long>().Query.AsNoTracking()
                .AnyAsync(d => d.OrderId == oid && d.DriverUserId == userId, cancellationToken)
            || await (
                from s in _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
                where s.UserId == userId && s.RestaurantId == orderRow.RestaurantId
                select s.Id).AnyAsync(cancellationToken);

        if (!canLink)
            return (null, restaurantId, null, null);

        restaurantId ??= orderRow.RestaurantId;

        var driverId = await _uow.Repository<Delivery, long>().Query.AsNoTracking()
            .Where(d => d.OrderId == oid)
            .Select(d => (long?)d.DriverUserId)
            .FirstOrDefaultAsync(cancellationToken);

        return (oid, restaurantId, driverId, null);
    }

    public async Task<IReadOnlyList<SupportTicketMineItemDto>> ListMineAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await (
            from x in _uow.Repository<SupportTicket, long>().Query.AsNoTracking()
            where x.UserId == userId
            join o in _uow.Repository<Order, long>().Query.AsNoTracking() on x.OrderId equals o.Id into og
            from o in og.DefaultIfEmpty()
            orderby x.CreatedAt descending
            select new SupportTicketMineItemDto(
                x.Id,
                x.Subject,
                x.Status,
                x.Category,
                x.Priority,
                x.CreatedAt,
                x.UpdatedAt,
                x.ResolvedAt,
                1 + x.Messages.Count,
                o != null ? o.OrderNumber : null))
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

        var preview = trimmed.Length > 80 ? trimmed[..80] + "…" : trimmed;
        await AdminSupportNotificationHelper.NotifyAdminsAsync(
            _uow,
            _hub,
            _log,
            ticketId,
            "Përgjigje nga klienti",
            $"{t.Subject}: {preview}",
            NotificationTypes.SupportClientReply,
            cancellationToken);

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
