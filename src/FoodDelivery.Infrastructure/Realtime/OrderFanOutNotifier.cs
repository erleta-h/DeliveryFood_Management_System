using System.Collections.Concurrent;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Realtime;

public sealed class OrderFanOutNotifier : IOrderRealtimeNotifier
{
    private static readonly ConcurrentDictionary<long, long> LastDriverLocationTickMs = new();

    /// <summary>Minimizon spam në SignalR kur deliveri dërgon GPS shpesh (watchPosition).</summary>
    private const int DriverLocationMinIntervalMs = 2500;

    private readonly IHubContext<OrderTrackingHub> _hub;
    private readonly IPushNotificationSender _push;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<OrderFanOutNotifier> _log;

    public OrderFanOutNotifier(
        IHubContext<OrderTrackingHub> hub,
        IPushNotificationSender push,
        IUnitOfWork uow,
        ILogger<OrderFanOutNotifier> log)
    {
        _hub = hub;
        _push = push;
        _uow = uow;
        _log = log;
    }

    public async Task NotifyOrderStatusChangedAsync(
        long orderId,
        int status,
        long restaurantId,
        long customerUserId,
        string orderNumber,
        CancellationToken cancellationToken = default)
    {
        var num = string.IsNullOrWhiteSpace(orderNumber) ? $"#{orderId}" : orderNumber.Trim();
        var (pushTitle, pushBody) = BuildCustomerStatusMessageSq(status, num);
        var hubPayload = new { orderId, status, orderNumber = num };
        var customerPayload = new
        {
            orderId,
            status,
            orderNumber = num,
            title = pushTitle,
            message = pushBody,
        };

        try
        {
            await _hub.Clients.Group($"order-{orderId}").SendAsync("orderStatus", hubPayload, cancellationToken);
            await _hub.Clients.Group($"restaurant-{restaurantId}").SendAsync("orderStatus", hubPayload, cancellationToken);
            await _hub.Clients.Group($"user-{customerUserId}").SendAsync("customerOrderStatus", customerPayload, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SignalR orderStatus për porosinë {OrderId} dështoi.", orderId);
        }

        try
        {
            await _push.SendToUserAsync(customerUserId, pushTitle, pushBody, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Web Push për përdoruesin {UserId} dështoi.", customerUserId);
        }

        try
        {
            var now = DateTime.UtcNow;
            _uow.Repository<Notification, long>().Add(new Notification
            {
                UserId = customerUserId,
                Title = pushTitle,
                Message = pushBody,
                Type = "order_status",
                IsRead = false,
                CreatedAt = now,
            });
            await _uow.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Ruajtja e njoftimit in-app për klientin {UserId} dështoi.", customerUserId);
        }
    }

    private static (string Title, string Body) BuildCustomerStatusMessageSq(int status, string orderNumber)
    {
        return status switch
        {
            OrderStatus.Pending => (
                "Porosia u regjistrua",
                $"{orderNumber}: në pritje të konfirmimit nga restoranti."),
            OrderStatus.Confirmed => (
                "Restoranti pranoi porosinë",
                $"{orderNumber}: gatimi fillon së shpejti."),
            OrderStatus.Preparing => (
                "Porosia në përgatitje",
                $"{orderNumber} po përgatitet në kuzhinë."),
            OrderStatus.ReadyForPickup => (
                "Ushqimi është gati",
                $"{orderNumber}: korrieri merr dorëzimin dhe niset drejt jush."),
            OrderStatus.OutForDelivery => (
                "Korrieri në rrugë",
                $"{orderNumber}: nisur drejt adresës suaj — hap detajin e porosisë për hartën."),
            OrderStatus.Delivered => (
                "Porosia u dorëzua",
                $"Faleminderit! {orderNumber} mbërriti."),
            OrderStatus.Cancelled => (
                "Porosia u anulua",
                $"{orderNumber} u anulua. Kontakto support nëse ke pyetje."),
            _ => (
                "Përditësim porosie",
                $"{orderNumber} ka një status të ri."),
        };
    }

    public async Task NotifyRestaurantNewOrderAsync(long orderId, long restaurantId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hub.Clients.Group($"restaurant-{restaurantId}").SendAsync("newOrder", new { orderId }, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SignalR newOrder për restorantin {RestaurantId} dështoi.", restaurantId);
        }
    }

    public async Task NotifyDriverLocationAsync(
        long orderId,
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        var now = Environment.TickCount64;
        if (LastDriverLocationTickMs.TryGetValue(orderId, out var prevTick))
        {
            var delta = now - prevTick;
            if (delta >= 0 && delta < DriverLocationMinIntervalMs)
                return;
        }

        LastDriverLocationTickMs[orderId] = now;

        var payload = new { orderId, latitude, longitude };
        try
        {
            await _hub.Clients.Group($"order-{orderId}").SendAsync("driverLocation", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SignalR driverLocation për porosinë {OrderId} dështoi.", orderId);
        }
    }

    public async Task NotifyDriverDeliveryOfferAsync(
        long driverUserId,
        long orderId,
        string orderNumber,
        CancellationToken cancellationToken = default)
    {
        var payload = new { orderId, orderNumber };
        try
        {
            await _hub.Clients.Group($"driver-{driverUserId}").SendAsync("deliveryOffer", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SignalR deliveryOffer për driver {DriverUserId} dështoi.", driverUserId);
        }

        try
        {
            await _push.SendToUserAsync(
                driverUserId,
                "Porosi e re",
                $"Ofertë dërgese {orderNumber} — hap aplikacionin e Deliver për ta pranuar.",
                cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Web Push delivery offer për driver {DriverUserId} dështoi.", driverUserId);
        }

        try
        {
            var now = DateTime.UtcNow;
            _uow.Repository<Notification, long>().Add(new Notification
            {
                UserId = driverUserId,
                Title = "Porosi e re — merre",
                Message =
                    $"Të është caktuar një dërgesë ({orderNumber}). Hap panelin «Dërgesat aktive» për ta pranuar ose për detaje.",
                Type = "delivery_offer",
                IsRead = false,
                CreatedAt = now,
            });
            await _uow.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Ruajtja e njoftimit in-app për ofertë dërgese dështoi (driver {DriverUserId}).", driverUserId);
        }
    }

    public async Task NotifyDriverDirectDeliveryAssignedAsync(
        long driverUserId,
        long orderId,
        string orderNumber,
        CancellationToken cancellationToken = default)
    {
        var payload = new { orderId, orderNumber };
        try
        {
            await _hub.Clients.Group($"driver-{driverUserId}").SendAsync("deliveryOffer", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SignalR deliveryOffer (direct) për driver {DriverUserId} dështoi.", driverUserId);
        }

        try
        {
            await _push.SendToUserAsync(
                driverUserId,
                "Dërgesë e re",
                $"Porosia {orderNumber} të është caktuar — nisu nga paneli i Deliver.",
                cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Web Push (direct assign) për driver {DriverUserId} dështoi.", driverUserId);
        }

        try
        {
            var now = DateTime.UtcNow;
            _uow.Repository<Notification, long>().Add(new Notification
            {
                UserId = driverUserId,
                Title = "Dërgesë e re",
                Message =
                    $"Restoranti të ka caktuar porosinë {orderNumber}. Hap «Dërgesat aktive» dhe nisu marrjen.",
                Type = "delivery_assigned_direct",
                IsRead = false,
                CreatedAt = now,
            });
            await _uow.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Ruajtja e njoftimit in-app (direct assign) dështoi (driver {DriverUserId}).", driverUserId);
        }
    }
}
