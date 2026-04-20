using FoodDelivery.Application.Orders;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Auth;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class OrdersService : IOrdersService
{
    private readonly FoodDeliveryDbContext _db;

    public OrdersService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<(long? OrderId, string? Error)> PlaceOrderAsync(
        long userId,
        PlaceOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Lines is not { Count: > 0 })
            return (null, "Zgjidh të paktën një artikull.");

        var user = await _db.Users
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
            return (null, "Përdoruesi nuk u gjet.");

        if (!PhoneValidation.TryNormalize(user.Phone, out var phoneNorm, out var phoneErr))
            return (null, phoneErr ?? "Shto një numër telefoni të vlefshëm te «Adresat» para porosisë.");

        var addr = user.Addresses.FirstOrDefault(a => a.IsDefault) ?? user.Addresses.FirstOrDefault();
        if (addr is null)
            return (null, "Mungon adresa e dorëzimit.");

        var restaurant = await _db.Restaurants.AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Id == request.RestaurantId && r.IsActive && r.IsApproved,
                cancellationToken);
        if (restaurant is null)
            return (null, "Restoranti nuk është i disponueshëm.");

        if (request.FulfillmentType != OrderFulfillmentType.Delivery
            && request.FulfillmentType != OrderFulfillmentType.Pickup)
            return (null, "Lloji i porosisë nuk është i vlefshëm (dërgesë ose marrje).");

        var lines = request.Lines
            .Where(l => l.Quantity > 0)
            .GroupBy(l => l.MenuItemId)
            .Select(g => (MenuItemId: g.Key, Quantity: g.Sum(x => x.Quantity)))
            .ToList();
        if (lines.Count == 0)
            return (null, "Sasitë duhet të jenë pozitive.");

        var menuItemIds = lines.Select(l => l.MenuItemId).ToList();
        var menuItems = await _db.MenuItems
            .Include(m => m.MenuCategory)
            .Where(m => menuItemIds.Contains(m.Id))
            .ToListAsync(cancellationToken);
        if (menuItems.Count != menuItemIds.Count)
            return (null, "Disa artikuj nuk ekzistojnë.");

        foreach (var m in menuItems)
        {
            if (m.MenuCategory.RestaurantId != request.RestaurantId)
                return (null, "Artikujt duhet të jenë nga i njëjti restorant.");
            if (!m.IsAvailable)
                return (null, $"«{m.Name}» nuk është i disponueshëm.");
        }

        decimal subtotal = 0;
        foreach (var line in lines)
        {
            var mi = menuItems.First(x => x.Id == line.MenuItemId);
            subtotal += mi.Price * line.Quantity;
        }

        if (subtotal < restaurant.MinOrderAmount)
            return (null, $"Shuma minimale e porosisë është {restaurant.MinOrderAmount:0.##} €.");

        var deliveryFee = request.FulfillmentType == OrderFulfillmentType.Pickup
            ? 0m
            : restaurant.DeliveryFee;
        var total = subtotal + deliveryFee;
        var now = DateTime.UtcNow;
        var orderNumber = $"FD-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";

        var order = new Order
        {
            OrderNumber = orderNumber,
            UserId = userId,
            RestaurantId = request.RestaurantId,
            CustomerAddressId = addr.Id,
            ContactPhone = phoneNorm,
            FulfillmentType = request.FulfillmentType,
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

        _db.Orders.Add(order);
        await _db.SaveChangesAsync(cancellationToken);

        foreach (var line in lines)
        {
            var mi = menuItems.First(x => x.Id == line.MenuItemId);
            _db.OrderItems.Add(new OrderItem
            {
                OrderId = order.Id,
                MenuItemId = mi.Id,
                NameSnapshot = mi.Name,
                Quantity = line.Quantity,
                UnitPrice = mi.Price,
                CreatedAt = now,
            });
        }

        _db.Payments.Add(new Payment
        {
            OrderId = order.Id,
            Amount = total,
            Currency = "EUR",
            Provider = "cod",
            Status = PaymentStatus.Pending,
            CreatedAt = now,
        });

        await _db.SaveChangesAsync(cancellationToken);
        return (order.Id, null);
    }

    public async Task<IReadOnlyList<CustomerOrderSummaryDto>> GetMyOrdersAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await _db.Orders.AsNoTracking()
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
                o.Total))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerOrderDetailDto?> GetMyOrderAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _db.Orders.AsNoTracking()
            .Include(o => o.Restaurant)
            .Include(o => o.CustomerAddress)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);
        if (order is null) return null;

        var pickup = order.FulfillmentType == OrderFulfillmentType.Pickup;
        var line1 = pickup
            ? (order.Restaurant.AddressLine ?? order.Restaurant.Name)
            : order.CustomerAddress.Line1;
        var city = pickup
            ? (order.Restaurant.City ?? "")
            : order.CustomerAddress.City;
        var postal = pickup ? null : order.CustomerAddress.PostalCode;

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
            line1,
            city,
            postal,
            items);
    }
}
