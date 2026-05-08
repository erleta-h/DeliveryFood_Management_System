using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Realtime; // Shtuar për Realtime Notifier
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class OrdersService : IOrdersService
{
    private readonly IUnitOfWork _uow;
  
    private readonly IOrderRealtimeNotifier _realtime; // Shtuar

    public OrdersService(IUnitOfWork uow, IOrderRealtimeNotifier realtime) // Injektuar)
    {
        _uow = uow;
        _realtime = realtime; // Caktuar
    }

    public async Task<(PlaceOrderResponse? Response, string? Error)> PlaceOrderAsync(
        long userId,
        PlaceOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Lines is not { Count: > 0 })
            return (null, "Zgjidh te pakten nje artikull.");

        var user = await _uow.Repository<User, long>().Query
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
            return (null, "Perdoruesi nuk u gjet.");

        if (!PhoneValidation.TryNormalize(user.Phone, out var phoneNorm, out var phoneErr))
            return (null, phoneErr ?? "Shto nje numer telefoni te vlefshem para porosise.");

        var restaurant = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Id == request.RestaurantId && r.IsActive && r.IsApproved,
                cancellationToken);

        if (restaurant is null)
            return (null, "Restoranti nuk eshte i disponueshem.");

        if (request.PaymentMethod != OrderPaymentMethod.CashOnDelivery
            && request.PaymentMethod != OrderPaymentMethod.Stripe)
            return (null, "Metoda e pageses nuk njihet.");

        var address = user.Addresses.FirstOrDefault(a => a.IsDefault)
            ?? user.Addresses.FirstOrDefault();

        if (address is null)
            return (null, "Mungon adresa e dorezimit.");

        var lines = request.Lines
            .Where(l => l.Quantity > 0)
            .GroupBy(l => l.MenuItemId)
            .Select(g => new
            {
                MenuItemId = g.Key,
                Quantity = g.Sum(x => x.Quantity)
            })
            .ToList();

        if (lines.Count == 0)
            return (null, "Sasite duhet te jene pozitive.");

        var menuItemIds = lines.Select(l => l.MenuItemId).ToList();

        var menuItems = await _uow.Repository<MenuItem, long>().Query
            .Include(m => m.MenuCategory)
            .Where(m => menuItemIds.Contains(m.Id))
            .ToListAsync(cancellationToken);

        if (menuItems.Count != menuItemIds.Count)
            return (null, "Disa artikuj nuk ekzistojne.");

        foreach (var item in menuItems)
        {
            if (item.MenuCategory.RestaurantId != request.RestaurantId)
                return (null, "Artikujt duhet te jene nga i njejti restorant.");

            if (!item.IsAvailable)
                return (null, $"«{item.Name}» nuk eshte i disponueshem.");
        }

        decimal subtotal = 0;

        foreach (var line in lines)
        {
            var item = menuItems.First(x => x.Id == line.MenuItemId);
            subtotal += item.Price * line.Quantity;
        }

        if (subtotal < restaurant.MinOrderAmount)
            return (null, $"Shuma minimale e porosise eshte {restaurant.MinOrderAmount:0.##} €.");

        var deliveryFee = restaurant.DeliveryFee;
        var total = subtotal + deliveryFee;
        var now = DateTime.UtcNow;

        var order = new Order
        {
            OrderNumber = $"FD-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
            UserId = userId,
            RestaurantId = request.RestaurantId,
            CustomerAddressId = address.Id,
            ContactPhone = phoneNorm,
            Status = OrderStatus.Pending,
            Subtotal = subtotal,
            DeliveryFee = deliveryFee,
            DiscountTotal = 0,
            Total = total,
            CustomerNotes = string.IsNullOrWhiteSpace(request.CustomerNotes)
                ? null
                : request.CustomerNotes.Trim(),
            PlacedAt = now,
            CreatedAt = now,
        };

        _uow.Repository<Order, long>().Add(order);
        await _uow.SaveChangesAsync(cancellationToken);

        foreach (var line in lines)
        {
            var item = menuItems.First(x => x.Id == line.MenuItemId);

            _uow.Repository<OrderItem, long>().Add(new OrderItem
            {
                OrderId = order.Id,
                MenuItemId = item.Id,
                NameSnapshot = item.Name,
                Quantity = line.Quantity,
                UnitPrice = item.Price,
                CreatedAt = now,
            });
        }

        var useStripe = request.PaymentMethod == OrderPaymentMethod.Stripe;

        _uow.Repository<Payment, long>().Add(new Payment
        {
            OrderId = order.Id,
            Amount = total,
            Currency = "EUR",
            Provider = useStripe ? "stripe" : "cod",
            Status = PaymentStatus.Pending,
            CreatedAt = now,
        });

        await _uow.SaveChangesAsync(cancellationToken);

        if (!useStripe)
        {
            // --- SHTUAR PËR REALTIME ---
            // Njofton restorantin që ka ardhur një porosi e re live

            await _realtime.NotifyRestaurantNewOrderAsync(
                order.Id,
                order.RestaurantId,
                cancellationToken);
        }

        return (new PlaceOrderResponse(order.Id, useStripe), null);
    }

    public async Task<IReadOnlyList<CustomerOrderSummaryDto>> GetMyOrdersAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<Order, long>().Query.AsNoTracking()
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.PlacedAt)
            .Select(o => new CustomerOrderSummaryDto(
                o.Id,
                o.OrderNumber,
                o.RestaurantId,
                o.Restaurant.Name,
                o.PlacedAt,
                o.Status,
                o.FulfillmentType,
                o.Total,
                false))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerOrderDetailDto?> GetMyOrderAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query.AsNoTracking()
            .Include(o => o.Restaurant)
            .Include(o => o.CustomerAddress)
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);

        if (order is null)
            return null;

        var pendingStripePayment = order.Payments.Any(p =>
            p.Provider == "stripe" && p.Status == PaymentStatus.Pending);

        var items = order.Items
            .Select(i => new CustomerOrderItemDto(
                i.NameSnapshot,
                i.Quantity,
                i.UnitPrice,
                i.UnitPrice * i.Quantity))
            .ToList();

        return new CustomerOrderDetailDto(
            order.Id,
            order.OrderNumber,
            order.RestaurantId,
            order.Restaurant.Name,
            order.PlacedAt,
            order.Status,
            order.FulfillmentType,
            order.Subtotal,
            order.DeliveryFee,
            order.Total,
            order.CustomerNotes,
            order.ContactPhone ?? string.Empty,
            order.CustomerAddress.Line1,
            order.CustomerAddress.City,
            order.CustomerAddress.PostalCode,
            items,
            order.Restaurant.Latitude,
            order.Restaurant.Longitude,
            order.CustomerAddress.Latitude,
            order.CustomerAddress.Longitude,
            null,
            null,
            false,
            null,
            pendingStripePayment);
    }

    public async Task<(bool Ok, string? Error)> CancelUnpaidStripeOrderAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);

        if (order is null)
            return (false, "Porosia nuk u gjet.");

        if (order.Status == OrderStatus.Cancelled)
            return (true, null);

        if (order.Status != OrderStatus.Pending)
            return (false, "Kjo porosi nuk mund te anulohet nga pagesa.");

        var stripePayment = order.Payments.FirstOrDefault(p => p.Provider == "stripe");

        if (stripePayment is null)
            return (false, "Kjo porosi nuk perdor pagese me karte.");

        if (stripePayment.Status == PaymentStatus.Captured)
            return (false, "Pagesa me karte eshte kryer tashme.");

        var now = DateTime.UtcNow;

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = now;
        order.UpdatedById = userId;

        _uow.Repository<OrderStatusHistory, long>().Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = OrderStatus.Cancelled,
            Note = "Klienti: pagesa me karte nuk u krye",
            CreatedAt = now,
            CreatedById = userId,
        });

        await _uow.SaveChangesAsync(cancellationToken);

        return (true, null);
    }

    public Task<bool> HideOrderFromCustomerHistoryAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(false);
    }
}