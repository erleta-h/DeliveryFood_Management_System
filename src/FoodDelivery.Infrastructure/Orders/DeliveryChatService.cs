using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class DeliveryChatService : IDeliveryChatService
{
    private const int MaxBodyLength = 2000;

    private readonly IUnitOfWork _uow;
    private readonly IHubContext<OrderTrackingHub> _hub;

    public DeliveryChatService(IUnitOfWork uow, IHubContext<OrderTrackingHub> hub)
    {
        _uow = uow;
        _hub = hub;
    }

    public async Task<(IReadOnlyList<DeliveryChatMessageDto>? Items, string? Error)> GetMessagesAsync(
        long orderId,
        long userId,
        CancellationToken cancellationToken = default)
    {
        var ctx = await LoadParticipantContextAsync(orderId, userId, requireOpenThread: false, cancellationToken);
        if (ctx.Error is { } err)
            return (null, err);

        var list = await _uow.Repository<OrderDeliveryChatMessage, long>().Query.AsNoTracking()
            .Where(m => m.OrderId == orderId)
            .OrderBy(m => m.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var customerId = ctx.Order!.UserId;
        var dtos = list.Select(m => MapDto(m, customerId)).ToList();

        return (dtos, null);
    }

    public async Task<(DeliveryChatMessageDto? Message, string? Error)> PostMessageAsync(
        long orderId,
        long userId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var trimmed = body.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return (null, "Mesazhi është bosh.");
        if (trimmed.Length > MaxBodyLength)
            return (null, $"Mesazhi është më i gjatë se {MaxBodyLength} karaktere.");

        var ctx = await LoadParticipantContextAsync(orderId, userId, requireOpenThread: true, cancellationToken);
        if (ctx.Error is { } err)
            return (null, err);

        var now = DateTime.UtcNow;
        var entity = new OrderDeliveryChatMessage
        {
            OrderId = orderId,
            SenderUserId = userId,
            Body = trimmed,
            CreatedAtUtc = now,
        };
        _uow.Repository<OrderDeliveryChatMessage, long>().Add(entity);
        await _uow.SaveChangesAsync(cancellationToken);

        var dto = MapDto(entity, ctx.Order!.UserId);

        await _hub.Clients
            .Group($"order-{orderId}")
            .SendAsync("deliveryChatMessage", dto, cancellationToken);

        return (dto, null);
    }

    private async Task<(Order? Order, string? Error)> LoadParticipantContextAsync(
        long orderId,
        long userId,
        bool requireOpenThread,
        CancellationToken cancellationToken)
    {
        var order = await _uow.Repository<Order, long>().Query.AsNoTracking()
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return (null, "Porosia nuk u gjet.");

        if (order.FulfillmentType == OrderFulfillmentType.Pickup)
            return (null, "Chat me korrier nuk vlen për marrje në restoran.");

        var delivery = order.Delivery;
        if (delivery is null || delivery.AcceptedAtUtc is null)
            return (null, "Chat aktivizohet pasi korrieri të ketë pranuar dërgesën.");

        var isCustomer = order.UserId == userId;
        var isDriver = delivery.DriverUserId == userId;
        if (!isCustomer && !isDriver)
            return (null, "Nuk ke akses në këtë bisedë.");

        if (requireOpenThread)
        {
            if (order.Status == OrderStatus.Cancelled)
                return (null, "Porosia është anuluar.");
            if (order.Status == OrderStatus.Delivered)
                return (null, "Porosia është dorëzuar — chat-i është mbyllur.");
        }

        return (order, null);
    }

    private static DeliveryChatMessageDto MapDto(OrderDeliveryChatMessage m, long customerUserId)
    {
        var role = m.SenderUserId == customerUserId ? "customer" : "driver";
        return new DeliveryChatMessageDto(m.Id, m.OrderId, m.SenderUserId, role, m.Body, m.CreatedAtUtc);
    }

}
