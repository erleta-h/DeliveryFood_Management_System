using FoodDelivery.Application.Orders;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class KitchenOrdersService : IKitchenOrdersService
{
    private readonly FoodDeliveryDbContext _db;

    public KitchenOrdersService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<KitchenStaffContextResponse> GetKitchenContextAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var row = await _db.RestaurantStaff
            .AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Join(
                _db.Restaurants.AsNoTracking(),
                s => s.RestaurantId,
                r => r.Id,
                (s, r) => new { r.Id, r.Name, r.Slug })
            .FirstOrDefaultAsync(cancellationToken);

        return row is null
            ? new KitchenStaffContextResponse(false, null, null, null)
            : new KitchenStaffContextResponse(true, row.Id, row.Name, row.Slug);
    }

    public async Task<KitchenTodayStatsDto> GetTodayStatsAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _db.RestaurantStaff.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return new KitchenTodayStatsDto(0, 0, 0m);

        var start = DateTime.UtcNow.Date;
        var end = start.AddDays(1);

        var baseQ = _db.Orders.AsNoTracking()
            .Where(o => o.RestaurantId == restaurantId.Value && o.PlacedAt >= start && o.PlacedAt < end);

        var ordersCount = await baseQ.CountAsync(cancellationToken);
        var completedCount = await baseQ.CountAsync(
            o => o.Status == OrderStatus.Delivered,
            cancellationToken);
        var revenue = await baseQ
            .Where(o => o.Status != OrderStatus.Cancelled)
            .SumAsync(o => (decimal?)o.Total, cancellationToken) ?? 0m;

        return new KitchenTodayStatsDto(ordersCount, completedCount, revenue);
    }

    public async Task<string?> UpdateOrderStatusAsync(
        long staffUserId,
        long orderId,
        int newStatus,
        string? note,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _db.RestaurantStaff
            .AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var order = await _db.Orders
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(
                o => o.Id == orderId && o.RestaurantId == restaurantId.Value,
                cancellationToken);

        if (order is null)
            return "Porosia nuk u gjet ose nuk i përket restorantit tënd.";

        if (order.Status == newStatus)
            return "Porosia është tashmë në këtë status.";

        if (!IsValidRestaurantStaffTransition(order.Status, newStatus, (int)order.FulfillmentType))
            return "Ky kalim statusi nuk lejohet për stafin e restorantit.";

        var noteTrimmed = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        var now = DateTime.UtcNow;
        order.Status = newStatus;
        order.UpdatedAt = now;
        order.UpdatedById = staffUserId;

        if (newStatus == OrderStatus.OutForDelivery && order.Delivery is not null)
        {
            order.Delivery.PickedUpAt = now;
            order.Delivery.UpdatedAt = now;
            order.Delivery.UpdatedById = staffUserId;
        }

        _db.OrderStatusHistory.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = newStatus,
            CreatedAt = now,
            CreatedById = staffUserId,
            Note = noteTrimmed,
        });

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<IReadOnlyList<KitchenOrderDto>> GetOrdersForMyRestaurantAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _db.RestaurantStaff.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return Array.Empty<KitchenOrderDto>();

        var eta = await _db.Restaurants.AsNoTracking()
            .Where(r => r.Id == restaurantId.Value)
            .Select(r => r.EstimatedDeliveryMinutes)
            .FirstAsync(cancellationToken);

        var orders = await _db.Orders.AsNoTracking()
            .Where(o => o.RestaurantId == restaurantId.Value)
            .OrderByDescending(o => o.PlacedAt)
            .Include(o => o.User)
            .Include(o => o.CustomerAddress)
            .Include(o => o.Restaurant)
            .Include(o => o.Items)
            .Include(o => o.Delivery!)
            .ThenInclude(d => d.Driver)
            .ToListAsync(cancellationToken);

        return orders.Select(o =>
        {
            string? driverDisp = null;
            if (o.Delivery?.Driver is { } dr)
                driverDisp = $"{dr.FirstName} {dr.LastName}".Trim();

            var pickup = o.FulfillmentType == OrderFulfillmentType.Pickup;
            var line1 = pickup ? (o.Restaurant.AddressLine ?? o.Restaurant.Name) : o.CustomerAddress.Line1;
            var city = pickup ? (o.Restaurant.City ?? "") : o.CustomerAddress.City;
            var postal = pickup ? null : o.CustomerAddress.PostalCode;
            var fulfillment = pickup ? "pickup" : "delivery";

            // RRESEPTIMI I GABIMIT CS7036 (Rreshti 162/163 ne image_732dd5.png)
            return new KitchenOrderDto(
                o.Id,
                o.OrderNumber,
                o.PlacedAt,
                o.Status,
                o.Subtotal,
                o.DeliveryFee,
                o.Total,
                o.CustomerNotes,
                o.User.FirstName,
                o.User.LastName,
                o.ContactPhone ?? string.Empty,
                line1,
                city,
                postal,
                eta,
                fulfillment,
                pickup ? null : (string.IsNullOrEmpty(driverDisp) ? null : driverDisp),
                o.Items.Select(i => new KitchenOrderLineDto(i.NameSnapshot, i.Quantity, i.UnitPrice)).ToList()
            );
        }).ToList(); // MBYLLJA E SAKTE E SELECT DHE TOLIST
    } // MBYLLJA E METODES

    public async Task<IReadOnlyList<KitchenAssignableDriverDto>> GetAssignableDriversAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _db.RestaurantStaff.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return Array.Empty<KitchenAssignableDriverDto>();

        var driverRole = await _db.Roles.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == "Driver", cancellationToken);
        if (driverRole is null)
            return Array.Empty<KitchenAssignableDriverDto>();

        return await (
            from d in _db.DriverProfiles.AsNoTracking()
            join u in _db.Users.AsNoTracking() on d.UserId equals u.Id
            where u.IsActive
            join ur in _db.UserRoles.AsNoTracking() on u.Id equals ur.UserId
            where ur.RoleId == driverRole.Id
            orderby u.FirstName, u.LastName
            select new KitchenAssignableDriverDto(
                d.UserId,
                ($"{u.FirstName} {u.LastName}").Trim(),
                d.VehicleType,
                d.LastLatitude,
                d.LastLongitude
            )
        ).ToListAsync(cancellationToken);
    }

    public async Task<string?> AssignDeliveryDriverAsync(
        long staffUserId,
        long orderId,
        long driverUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _db.RestaurantStaff.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var order = await _db.Orders
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(
                o => o.Id == orderId && o.RestaurantId == restaurantId.Value,
                cancellationToken);

        if (order is null) return "Porosia nuk u gjet.";

        var now = DateTime.UtcNow;
        if (order.Delivery is null)
        {
            order.Delivery = new Delivery
            {
                OrderId = order.Id,
                DriverUserId = driverUserId,
                Status = 0,
                CreatedAt = now,
                CreatedById = staffUserId
            };
        }
        else
        {
            order.Delivery.DriverUserId = driverUserId;
            order.Delivery.UpdatedAt = now;
            order.Delivery.UpdatedById = staffUserId;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static bool IsValidRestaurantStaffTransition(int from, int to, int fulfillmentType)
    {
        var pickup = fulfillmentType == (int)OrderFulfillmentType.Pickup;
        return (from, to) switch
        {
            (OrderStatus.Pending, OrderStatus.Confirmed) => true,
            (OrderStatus.Pending, OrderStatus.Cancelled) => true,
            (OrderStatus.Confirmed, OrderStatus.Preparing) => true,
            (OrderStatus.Preparing, OrderStatus.ReadyForPickup) => true,
            (OrderStatus.ReadyForPickup, OrderStatus.OutForDelivery) => !pickup,
            (OrderStatus.ReadyForPickup, OrderStatus.Delivered) => pickup,
            _ => false
        };
    }
}