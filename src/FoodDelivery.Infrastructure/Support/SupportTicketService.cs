using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Support;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Support;

public sealed class SupportTicketService : ISupportTicketService
{
    private readonly IUnitOfWork _uow;

    public SupportTicketService(IUnitOfWork uow)
    {
        _uow = uow;
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

        long? orderId = request.OrderId;
        long? restaurantId = request.RestaurantId;

        if (orderId is { } oid)
        {
            var order = await _uow.Repository<Order, long>().Query.AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == oid, cancellationToken);
            if (order is null)
                return (null, "Porosia nuk u gjet.");
            if (order.UserId != userId)
                return (null, "Porosia nuk i përket llogarisë suaj.");
            if (restaurantId is { } rid)
            {
                if (order.RestaurantId != rid)
                    return (null, "Restoranti nuk përputhet me porosinë.");
            }
            else
                restaurantId = order.RestaurantId;
        }
        else if (restaurantId is { } restId)
        {
            var exists = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
                .AnyAsync(r => r.Id == restId, cancellationToken);
            if (!exists)
                return (null, "Restoranti nuk u gjet.");
        }

        var now = DateTime.UtcNow;
        var t = new SupportTicket
        {
            UserId = userId,
            Subject = subject,
            Body = body,
            Status = SupportTicketStatus.Open,
            CreatedAt = now,
            OrderId = orderId,
            RestaurantId = restaurantId,
        };
        _uow.Repository<SupportTicket, long>().Add(t);
        await _uow.SaveChangesAsync(cancellationToken);
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
                x.CreatedAt,
                x.UpdatedAt,
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
