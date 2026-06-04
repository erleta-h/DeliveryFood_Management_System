using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Caching;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class KitchenOrdersService : IKitchenOrdersService
{
    private readonly IUnitOfWork _uow;
    private readonly IDeliveryAutoDispatchService _autoDispatch;
    private readonly IOrderRealtimeNotifier _realtime;
    private readonly IDistributedCache _cache;

    public KitchenOrdersService(
        IUnitOfWork uow,
        IDeliveryAutoDispatchService autoDispatch,
        IOrderRealtimeNotifier realtime,
        IDistributedCache cache)
    {
        _uow = uow;
        _autoDispatch = autoDispatch;
        _realtime = realtime;
        _cache = cache;
    }

    public async Task<KitchenStaffContextResponse> GetKitchenContextAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var row = await _uow.Repository<RestaurantStaff, long>().Query
            .AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Join(
                _uow.Repository<Restaurant, long>().Query.AsNoTracking(),
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
        var restaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return new KitchenTodayStatsDto(0, 0, 0m);

        var start = DateTime.UtcNow.Date;
        var end = start.AddDays(1);

        var baseQ = _uow.Repository<Order, long>().Query.AsNoTracking()
            .Where(o => o.RestaurantId == restaurantId.Value && o.PlacedAt >= start && o.PlacedAt < end)
            .Where(o =>
                o.Payments.Any(p => p.Provider == "cod")
                || o.Payments.Any(p => p.Provider == "stripe" && p.Status == PaymentStatus.Captured));

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
        var restaurantId = await _uow.Repository<RestaurantStaff, long>().Query
            .AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(
                o => o.Id == orderId && o.RestaurantId == restaurantId.Value,
                cancellationToken);

        if (order is null)
            return "Porosia nuk u gjet ose nuk i përket restorantit tënd.";

        if (newStatus != OrderStatus.Cancelled
            && await BlockIfStripePaymentPendingAsync(order.Id, cancellationToken) is { } payBlock)
            return payBlock;

        if (order.Status == newStatus)
            return "Porosia është tashmë në këtë status.";

        if (!IsValidRestaurantStaffTransition(order.Status, newStatus, order.FulfillmentType))
            return "Ky kalim statusi nuk lejohet për stafin e restorantit.";

        var noteTrimmed = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        if (newStatus == OrderStatus.Cancelled && string.IsNullOrEmpty(noteTrimmed))
            return "Për refuzim, shto një arsye (shënim).";

        if (noteTrimmed is { Length: > 500 })
            return "Shënimi është shumë i gjatë (max 500 karaktere).";

        var now = DateTime.UtcNow;
        order.Status = newStatus;
        order.UpdatedAt = now;
        order.UpdatedById = staffUserId;

        _uow.Repository<OrderStatusHistory, long>().Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = newStatus,
            CreatedAt = now,
            CreatedById = staffUserId,
            Note = noteTrimmed,
        });

        if (newStatus == OrderStatus.Cancelled)
        {
            _uow.Repository<AuditLog, long>().Add(new AuditLog
            {
                Action = "kitchen.order.rejected",
                Entity = "Order",
                EntityId = order.Id.ToString(),
                OldValue = order.OrderNumber,
                NewValue = noteTrimmed,
                UserId = staffUserId,
                CreatedAt = now,
                CreatedById = staffUserId,
            });
        }

        await _uow.SaveChangesAsync(cancellationToken);

        await _realtime.NotifyOrderStatusChangedAsync(
            order.Id,
            newStatus,
            order.RestaurantId,
            order.UserId,
            order.OrderNumber,
            newStatus == OrderStatus.Cancelled ? noteTrimmed : null,
            cancellationToken);

        await AdminDashboardCacheInvalidation.InvalidateAsync(_cache, cancellationToken).ConfigureAwait(false);

        if ((newStatus == OrderStatus.Confirmed || newStatus == OrderStatus.ReadyForPickup)
            && order.FulfillmentType == OrderFulfillmentType.Delivery)
            await _autoDispatch.StartAutoDispatchForOrderAsync(order.Id, staffUserId, cancellationToken);

        return null;
    }

    public async Task<string?> UpdateOrderPrepMinutesAsync(
        long staffUserId,
        long orderId,
        int prepMinutes,
        CancellationToken cancellationToken = default)
    {
        if (prepMinutes < 5 || prepMinutes > 300)
            return "Koha e përgatitjes duhet të jetë midis 5 dhe 300 minutash.";

        var restaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var order = await _uow.Repository<Order, long>().Query
            .FirstOrDefaultAsync(
                o => o.Id == orderId && o.RestaurantId == restaurantId.Value,
                cancellationToken);
        if (order is null)
            return "Porosia nuk u gjet ose nuk i përket restorantit tënd.";

        if (await BlockIfStripePaymentPendingAsync(order.Id, cancellationToken) is { } payBlock)
            return payBlock;

        if (order.Status is not (OrderStatus.Pending or OrderStatus.Confirmed or OrderStatus.Preparing))
            return "Mund të ndryshohet vetëm për porosi në pritje, të pranuara ose në përgatitje.";

        var now = DateTime.UtcNow;
        order.EstimatedPrepMinutes = prepMinutes;
        order.UpdatedAt = now;
        order.UpdatedById = staffUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private async Task<string?> BlockIfStripePaymentPendingAsync(long orderId, CancellationToken cancellationToken)
    {
        var pending = await _uow.Repository<Payment, long>().Query.AsNoTracking()
            .AnyAsync(
                p => p.OrderId == orderId && p.Provider == "stripe" && p.Status == PaymentStatus.Pending,
                cancellationToken);
        return pending
            ? "Kjo porosi nuk mund të përpunohet derisa të përfundohet pagesa me kartë."
            : null;
    }

    /// <summary>
    /// Stafi përgatit deri «gati»; kalimi në dërgesë bëhet nga Deliver pas marrjes.
    /// Për pickup: «marrë nga klienti» → përfunduar.
    /// </summary>
    private static bool IsValidRestaurantStaffTransition(int from, int to, int fulfillmentType)
    {
        var pickup = fulfillmentType == OrderFulfillmentType.Pickup;
        return (from, to) switch
        {
            (OrderStatus.Pending, OrderStatus.Confirmed) => true,
            (OrderStatus.Pending, OrderStatus.Cancelled) => true,
            (OrderStatus.Confirmed, OrderStatus.Preparing) => true,
            (OrderStatus.Confirmed, OrderStatus.Cancelled) => true,
            (OrderStatus.Preparing, OrderStatus.ReadyForPickup) => true,
            (OrderStatus.Preparing, OrderStatus.Cancelled) => true,
            (OrderStatus.ReadyForPickup, OrderStatus.Delivered) => pickup,
            (OrderStatus.ReadyForPickup, OrderStatus.Cancelled) => true,
            _ => false,
        };
    }

    public async Task<IReadOnlyList<KitchenAssignableDriverDto>> GetAssignableDriversAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);
        if (restaurantId is null)
            return Array.Empty<KitchenAssignableDriverDto>();

        var driverRoleId = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .Where(r => r.Name == DbSeeder.DriverRoleName)
            .Select(r => (long?)r.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (driverRoleId is null)
            return Array.Empty<KitchenAssignableDriverDto>();

        return await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
            .Where(d => d.User.IsActive)
            .Where(d => d.IsOnline)
            .Where(d => d.User.UserRoles.Any(ur => ur.RoleId == driverRoleId.Value))
            .OrderBy(d => d.User.LastName)
            .ThenBy(d => d.User.FirstName)
            .Select(d => new KitchenAssignableDriverDto(
                d.UserId,
                (d.User.FirstName + " " + d.User.LastName).Trim(),
                d.VehicleType,
                d.User.Phone,
                d.LicensePlate,
                d.IsOnline,
                d.LastLatitude,
                d.LastLongitude))
            .ToListAsync(cancellationToken);
    }

    public async Task<string?> AssignDeliveryDriverAsync(
        long staffUserId,
        long orderId,
        long driverUserId,
        bool immediateHandoff,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var driverRoleId = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .Where(r => r.Name == DbSeeder.DriverRoleName)
            .Select(r => (long?)r.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (driverRoleId is null)
            return "Roli Deliver nuk është konfiguruar.";

        var isDriver = await _uow.Repository<UserRole, long>().Query.AsNoTracking()
            .AnyAsync(ur => ur.UserId == driverUserId && ur.RoleId == driverRoleId.Value, cancellationToken);
        var profile = await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(d => d.UserId == driverUserId, cancellationToken);
        var driverUser = await _uow.Repository<User, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == driverUserId, cancellationToken);
        if (!isDriver || profile is null || driverUser is null || !driverUser.IsActive)
            return "Deliver nuk u gjet ose llogaria nuk është aktive.";

        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(
                o => o.Id == orderId && o.RestaurantId == restaurantId.Value,
                cancellationToken);
        if (order is null)
            return "Porosia nuk u gjet ose nuk i përket restorantit tënd.";

        if (await BlockIfStripePaymentPendingAsync(order.Id, cancellationToken) is { } payBlock)
            return payBlock;

        if (order.FulfillmentType != OrderFulfillmentType.Delivery)
            return "Caktimi i Deliver vlen vetëm për porosi dërgese.";
        if (order.Status != OrderStatus.ReadyForPickup)
            return "Cakto Deliver kur porosia është «gati për marrje».";

        var now = DateTime.UtcNow;
        if (order.Delivery is null)
        {
            var delivery = new Delivery
            {
                OrderId = order.Id,
                DriverUserId = driverUserId,
                Status = immediateHandoff
                    ? DeliveryDriverLeg.EnRouteToCustomer
                    : DeliveryDriverLeg.HeadingToRestaurant,
                OfferedAtUtc = now,
                AcceptedAtUtc = now,
                ArrivedAtRestaurantUtc = immediateHandoff ? now : null,
                AutoDispatchExcludedDriverIdsJson = null,
                PickedUpAt = immediateHandoff ? now : null,
                CreatedAt = now,
                CreatedById = staffUserId,
            };
            order.Delivery = delivery;
            _uow.Repository<Delivery, long>().Add(delivery);
        }
        else
        {
            if (order.Delivery.PickedUpAt is not null)
                return "Nuk mund të ndërrsh Deliver-in pasi është regjistruar marrja nga restoranti.";
            order.Delivery.DriverUserId = driverUserId;
            order.Delivery.Status = immediateHandoff
                ? DeliveryDriverLeg.EnRouteToCustomer
                : DeliveryDriverLeg.HeadingToRestaurant;
            order.Delivery.OfferedAtUtc = now;
            order.Delivery.AcceptedAtUtc = now;
            order.Delivery.ArrivedAtRestaurantUtc = immediateHandoff ? now : null;
            order.Delivery.PickedUpAt = immediateHandoff ? now : null;
            order.Delivery.AutoDispatchExcludedDriverIdsJson = null;
            order.Delivery.UpdatedAt = now;
            order.Delivery.UpdatedById = staffUserId;
        }

        if (immediateHandoff)
        {
            order.Status = OrderStatus.OutForDelivery;
            _uow.Repository<OrderStatusHistory, long>().Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                Status = OrderStatus.OutForDelivery,
                CreatedAt = now,
                CreatedById = staffUserId,
                Note = "Kuzhina: caktim Deliver + dërgesë e konfirmuar (UI)",
            });
        }

        order.UpdatedAt = now;
        order.UpdatedById = staffUserId;
        await _uow.SaveChangesAsync(cancellationToken);

        if (immediateHandoff)
        {
            await _realtime.NotifyOrderStatusChangedAsync(
                order.Id,
                OrderStatus.OutForDelivery,
                order.RestaurantId,
                order.UserId,
                order.OrderNumber,
                null,
                cancellationToken);
            await _realtime.NotifyDriverDirectDeliveryAssignedAsync(
                driverUserId,
                order.Id,
                order.OrderNumber,
                cancellationToken);
        }
        else
        {
            await _realtime.NotifyDriverDeliveryOfferAsync(driverUserId, order.Id, order.OrderNumber, cancellationToken);
        }

        return null;
    }

    public async Task<KitchenOrderHistoryResultDto> GetOrderHistoryAsync(
        long staffUserId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return new KitchenOrderHistoryResultDto(Array.Empty<KitchenOrderDto>(), 0, page, pageSize);

        page = Math.Clamp(page, 1, 10_000);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var baseQ = _uow.Repository<Order, long>().Query.AsNoTracking()
            .Where(o => o.RestaurantId == restaurantId.Value)
            .Where(o => o.Status == OrderStatus.Delivered || o.Status == OrderStatus.Cancelled);

        var total = await baseQ.CountAsync(cancellationToken);

        var orders = await baseQ
            .OrderByDescending(o => o.PlacedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(o => o.User)
            .Include(o => o.CustomerAddress)
            .Include(o => o.Restaurant)
            .Include(o => o.Items)
            .Include(o => o.Delivery!)
            .ThenInclude(d => d.Driver)
            .ToListAsync(cancellationToken);

        var driverIds = orders
            .Where(o => o.Delivery != null && o.Delivery.DriverUserId != 0)
            .Select(o => o.Delivery!.DriverUserId)
            .Distinct()
            .ToList();

        var driverNames = await LoadDriverDisplayNamesAsync(driverIds, cancellationToken);
        Dictionary<long, string> vehicleByDriver = new();
        if (driverIds.Count > 0)
        {
            var profiles = await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
                .Where(p => driverIds.Contains(p.UserId))
                .Select(p => new { p.UserId, p.VehicleType })
                .ToListAsync(cancellationToken);
            foreach (var p in profiles)
                vehicleByDriver[p.UserId] = p.VehicleType;
        }

        var dtos = MapToKitchenOrderDtos(orders, vehicleByDriver, driverNames);
        return new KitchenOrderHistoryResultDto(dtos, total, page, pageSize);
    }

    public async Task<IReadOnlyList<KitchenOrderDto>> GetOrdersForMyRestaurantAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantId is null)
            return Array.Empty<KitchenOrderDto>();

        var orders = await _uow.Repository<Order, long>().Query.AsNoTracking()
            .Where(o => o.RestaurantId == restaurantId.Value)
            .Where(o =>
                o.Payments.Any(p => p.Provider == "cod")
                || o.Payments.Any(p => p.Provider == "stripe" && p.Status == PaymentStatus.Captured))
            .OrderByDescending(o => o.PlacedAt)
            .Include(o => o.User)
            .Include(o => o.CustomerAddress)
            .Include(o => o.Restaurant)
            .Include(o => o.Items)
            .Include(o => o.Delivery!)
            .ThenInclude(d => d.Driver)
            .ToListAsync(cancellationToken);

        var driverIds = orders
            .Where(o => o.Delivery != null && o.Delivery.DriverUserId != 0)
            .Select(o => o.Delivery!.DriverUserId)
            .Distinct()
            .ToList();

        var driverNames = await LoadDriverDisplayNamesAsync(driverIds, cancellationToken);
        Dictionary<long, string> vehicleByDriver = new();
        if (driverIds.Count > 0)
        {
            var profiles = await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
                .Where(p => driverIds.Contains(p.UserId))
                .Select(p => new { p.UserId, p.VehicleType })
                .ToListAsync(cancellationToken);
            foreach (var p in profiles)
                vehicleByDriver[p.UserId] = p.VehicleType;
        }

        return MapToKitchenOrderDtos(orders, vehicleByDriver, driverNames);
    }

    private async Task<IReadOnlyDictionary<long, string>> LoadDriverDisplayNamesAsync(
        IReadOnlyList<long> driverUserIds,
        CancellationToken cancellationToken)
    {
        if (driverUserIds.Count == 0)
            return new Dictionary<long, string>();

        var users = await _uow.Repository<User, long>().Query.AsNoTracking()
            .Where(u => driverUserIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .ToListAsync(cancellationToken);

        var dict = new Dictionary<long, string>();
        foreach (var u in users)
        {
            var name = $"{u.FirstName} {u.LastName}".Trim();
            if (!string.IsNullOrEmpty(name))
                dict[u.Id] = name;
        }

        return dict;
    }

    private static IReadOnlyList<KitchenOrderDto> MapToKitchenOrderDtos(
        IReadOnlyList<Order> orders,
        IReadOnlyDictionary<long, string>? vehicleByDriver = null,
        IReadOnlyDictionary<long, string>? driverNameByUserId = null)
    {
        vehicleByDriver ??= new Dictionary<long, string>();
        driverNameByUserId ??= new Dictionary<long, string>();

        return orders.Select(o =>
        {
            string? driverDisp = null;
            if (o.Delivery?.Driver is { } dr)
                driverDisp = $"{dr.FirstName} {dr.LastName}".Trim();
            var assignedDriverId = o.Delivery?.DriverUserId ?? 0;
            if (string.IsNullOrEmpty(driverDisp)
                && assignedDriverId > 0
                && driverNameByUserId.TryGetValue(assignedDriverId, out var fallbackName))
                driverDisp = fallbackName;

            var pickup = o.FulfillmentType == OrderFulfillmentType.Pickup;
            var line1 = pickup
                ? (o.Restaurant.AddressLine ?? o.Restaurant.Name)
                : o.CustomerAddress.Line1;
            var city = pickup
                ? (o.Restaurant.City ?? "")
                : o.CustomerAddress.City;
            var postal = pickup ? null : o.CustomerAddress.PostalCode;
            var fulfillment = pickup ? "pickup" : "delivery";

            double? destLat = pickup ? null : o.CustomerAddress.Latitude;
            double? destLng = pickup ? null : o.CustomerAddress.Longitude;

            string? driverVehicle = null;
            if (!pickup && o.Delivery?.DriverUserId is { } duid && vehicleByDriver.TryGetValue(duid, out var vt))
                driverVehicle = string.IsNullOrWhiteSpace(vt) ? null : vt;

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
                o.EstimatedPrepMinutes,
                fulfillment,
                pickup ? null : (string.IsNullOrEmpty(driverDisp) ? null : driverDisp),
                pickup ? null : o.Delivery?.DriverUserId,
                o.Items
                    .Select(i => new KitchenOrderLineDto(i.NameSnapshot, i.Quantity, i.UnitPrice))
                    .ToList(),
                pickup ? null : driverVehicle,
                pickup ? null : o.Delivery?.Status,
                pickup ? null : o.Delivery?.OfferedAtUtc,
                pickup ? null : o.Delivery?.AcceptedAtUtc,
                pickup ? null : o.Delivery?.ArrivedAtRestaurantUtc,
                o.Restaurant.Latitude,
                o.Restaurant.Longitude,
                destLat,
                destLng);
        }).ToList();
    }
}
