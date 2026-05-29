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
    private readonly IDeliveryChatStore _chatStore;
    private readonly IHubContext<OrderTrackingHub> _hub;

    public DeliveryChatService(
        IUnitOfWork uow,
        IDeliveryChatStore chatStore,
        IHubContext<OrderTrackingHub> hub)
    {
        _uow = uow;
        _chatStore = chatStore;
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

        var list = await _chatStore.GetByOrderIdAsync(orderId, cancellationToken);
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

        var record = await _chatStore.InsertAsync(orderId, userId, trimmed, cancellationToken);
        await _chatStore.MarkDeliveredAsync(orderId, record.Id, cancellationToken);
        var delivered = record with { IsDelivered = true };
        var order = ctx.Order!;
        var dto = MapDto(delivered, order.UserId);

        var orderGroup = $"order-{orderId}";
        await _hub.Clients.Group(orderGroup)
            .SendAsync("deliveryChatMessage", dto, cancellationToken);

        var driverUserId = order.Delivery?.DriverUserId;
        if (driverUserId is not null)
        {
            await _hub.Clients.Group($"driver-{driverUserId.Value}")
                .SendAsync("deliveryChatMessage", dto, cancellationToken);
        }

        return (dto, null);
    }

    public async Task<string?> MarkSeenAsync(long orderId, long userId, CancellationToken cancellationToken = default)
    {
        var ctx = await LoadParticipantContextAsync(orderId, userId, requireOpenThread: false, cancellationToken);
        if (ctx.Error is { } err)
            return err;

        var order = ctx.Order!;
        await _chatStore.MarkSeenAsync(orderId, userId, cancellationToken);

        var seenPayload = new { orderId, seenByUserId = userId, seenAtUtc = DateTime.UtcNow };
        await _hub.Clients.Group($"order-{orderId}")
            .SendAsync("deliveryChatSeen", seenPayload, cancellationToken);

        var driverUserId = order.Delivery?.DriverUserId;
        if (driverUserId is not null)
        {
            await _hub.Clients.Group($"driver-{driverUserId.Value}")
                .SendAsync("deliveryChatSeen", seenPayload, cancellationToken);
        }

        return null;
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

    private static DeliveryChatMessageDto MapDto(DeliveryChatMessageRecord m, long customerUserId)
    {
        var role = m.SenderUserId == customerUserId ? "customer" : "driver";
        return new DeliveryChatMessageDto(m.Id, m.OrderId, m.SenderUserId, role, m.Body, m.CreatedAtUtc, m.IsDelivered, m.SeenAtUtc);
    }
}
