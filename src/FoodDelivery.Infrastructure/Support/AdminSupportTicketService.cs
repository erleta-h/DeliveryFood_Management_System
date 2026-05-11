using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Application.Support;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Support;

public sealed class AdminSupportTicketService : IAdminSupportTicketService
{
    private const int MaxPageSize = 100;

    private readonly IUnitOfWork _uow;
    private readonly IPushNotificationSender _push;
    private readonly IHubContext<OrderTrackingHub> _hub;
    private readonly ILogger<AdminSupportTicketService> _log;

    public AdminSupportTicketService(
        IUnitOfWork uow,
        IPushNotificationSender push,
        IHubContext<OrderTrackingHub> hub,
        ILogger<AdminSupportTicketService> log)
    {
        _uow = uow;
        _push = push;
        _hub = hub;
        _log = log;
    }

    public async Task<AdminSupportTicketListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? sort,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _uow.Repository<SupportTicket, long>().Query.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(t =>
                t.Subject.Contains(s)
                || t.Body.Contains(s)
                || _uow.Repository<User, long>().Query.Any(u => u.Id == t.UserId && u.Email.Contains(s)));
        }

        var total = await q.CountAsync(cancellationToken);
        var ordered = (sort ?? "created_desc").Trim().ToLowerInvariant() switch
        {
            "created_asc" => q.OrderBy(x => x.CreatedAt),
            "subject_asc" => q.OrderBy(x => x.Subject),
            "status_asc" => q.OrderBy(x => x.Status).ThenByDescending(x => x.CreatedAt),
            _ => q.OrderByDescending(x => x.CreatedAt),
        };
        var items = await ordered
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(t => new AdminSupportTicketItemDto(
                t.Id,
                t.UserId,
                t.User.Email,
                t.Subject,
                t.Body,
                t.Status,
                t.CreatedAt,
                t.UpdatedAt,
                t.AdminNote,
                t.OrderId,
                t.Order != null ? t.Order.OrderNumber : null,
                t.RestaurantId,
                t.Restaurant != null ? t.Restaurant.Name : null,
                1 + t.Messages.Count))
            .ToListAsync(cancellationToken);

        return new AdminSupportTicketListResultDto(items, total, p, ps);
    }

    public async Task<string?> UpdateAsync(
        long ticketId,
        AdminUpdateSupportTicketRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Status is not (SupportTicketStatus.Open or SupportTicketStatus.Closed))
            return "Status i pavlefshëm.";

        var t = await _uow.Repository<SupportTicket, long>().Query.FirstOrDefaultAsync(
            x => x.Id == ticketId,
            cancellationToken);
        if (t is null)
            return "Tiketa nuk u gjet.";

        var note = string.IsNullOrWhiteSpace(request.AdminNote) ? null : request.AdminNote.Trim();
        if (note is { Length: > 2000 })
            return "Shënimi i adminit: maks. 2000 karaktere.";

        var now = DateTime.UtcNow;
        t.Status = request.Status;
        t.AdminNote = note;
        t.UpdatedAt = now;
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<SupportTicketThreadDto?> GetThreadAsync(
        long ticketId,
        CancellationToken cancellationToken = default)
    {
        var t = await _uow.Repository<SupportTicket, long>().Query
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Messages).ThenInclude(m => m.Author)
            .Include(x => x.Order)
            .Include(x => x.Restaurant)
            .FirstOrDefaultAsync(x => x.Id == ticketId, cancellationToken);
        return t is null ? null : MapThread(t);
    }

    public async Task<string?> PostStaffReplyAsync(
        long staffUserId,
        long ticketId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var trimmed = body.Trim();
        if (trimmed.Length is < 1 or > 4000)
            return "Mesazhi: 1–4000 karaktere.";

        var t = await _uow.Repository<SupportTicket, long>().Query
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == ticketId, cancellationToken);
        if (t is null)
            return "Tiketa nuk u gjet.";
        if (t.Status == SupportTicketStatus.Closed)
            return "Tiketa është e mbyllur.";

        var now = DateTime.UtcNow;
        var pushTitle = "Përgjigje nga supporti";
        var preview = trimmed.Length > 120 ? trimmed[..120] + "…" : trimmed;
        var pushBody = $"{t.Subject}: {preview}";

        var notif = new Notification
        {
            UserId = t.UserId,
            Title = pushTitle,
            Message = pushBody,
            Type = "support_reply",
            IsRead = false,
            CreatedAt = now,
            CreatedById = staffUserId,
        };

        _uow.Repository<SupportTicketMessage, long>().Add(new SupportTicketMessage
        {
            SupportTicketId = ticketId,
            AuthorUserId = staffUserId,
            Body = trimmed,
            IsStaffReply = true,
            CreatedAt = now,
        });
        _uow.Repository<Notification, long>().Add(notif);
        t.UpdatedAt = now;

        await _uow.SaveChangesAsync(cancellationToken);

        try
        {
            await _push.SendToUserAsync(t.UserId, pushTitle, pushBody, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Web Push për tiketën {TicketId} (përdoruesi {UserId}) dështoi.", ticketId, t.UserId);
        }

        try
        {
            await _hub.Clients
                .Group($"user-{t.UserId}")
                .SendAsync(
                    "customerNotification",
                    new
                    {
                        id = notif.Id,
                        title = pushTitle,
                        message = pushBody,
                        type = "support_reply",
                        ticketId,
                        createdAtUtc = now,
                    },
                    cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SignalR customerNotification për përdoruesin {UserId} dështoi.", t.UserId);
        }

        return null;
    }

    private static SupportTicketThreadDto MapThread(SupportTicket t)
    {
        var messages = t.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportTicketMessageDto(
                m.Id,
                m.AuthorUserId,
                m.Author.Email,
                m.IsStaffReply,
                m.Body,
                m.CreatedAt))
            .ToList();

        return new SupportTicketThreadDto(
            t.Id,
            t.UserId,
            t.User.Email,
            t.Subject,
            t.Body,
            t.Status,
            t.CreatedAt,
            t.UpdatedAt,
            t.AdminNote,
            t.OrderId,
            t.Order?.OrderNumber,
            t.RestaurantId,
            t.Restaurant?.Name,
            messages);
    }
}
