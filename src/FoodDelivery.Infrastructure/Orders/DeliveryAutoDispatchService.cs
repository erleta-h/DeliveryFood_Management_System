using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class DeliveryAutoDispatchService : IDeliveryAutoDispatchService
{
    private readonly IUnitOfWork _uow;
    private readonly DeliveryDispatchSettings _opt;
    private readonly IOrderRealtimeNotifier _realtime;

    public DeliveryAutoDispatchService(
        IUnitOfWork uow,
        IOptions<DeliveryDispatchSettings> options,
        IOrderRealtimeNotifier realtime)
    {
        _uow = uow;
        _opt = options.Value;
        _realtime = realtime;
    }

    public async Task StartAutoDispatchForOrderAsync(long orderId, long? createdByUserId, CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .Include(o => o.Restaurant)
            .Include(o => o.CustomerAddress)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return;
        if (order.FulfillmentType != OrderFulfillmentType.Delivery)
            return;
        if (order.Status != OrderStatus.Confirmed && order.Status != OrderStatus.ReadyForPickup)
            return;
        if (order.Delivery is not null)
            return;

        var excluded = new HashSet<long>();
        var next = await PickNextDriverUserIdAsync(order, excluded, cancellationToken);
        if (next is null)
            return;

        var now = DateTime.UtcNow;
        var delivery = new Delivery
        {
            OrderId = order.Id,
            DriverUserId = next.Value,
            Status = DeliveryDriverLeg.HeadingToRestaurant,
            OfferedAtUtc = now,
            AcceptedAtUtc = now,
            AutoDispatchExcludedDriverIdsJson = ExcludedDriverIdsJson.FromSet(excluded),
            CreatedAt = now,
            CreatedById = createdByUserId,
        };
        order.Delivery = delivery;
        _uow.Repository<Delivery, long>().Add(delivery);
        order.UpdatedAt = now;
        order.UpdatedById = createdByUserId;
        await _uow.SaveChangesAsync(cancellationToken);

        await _realtime.NotifyDriverDeliveryOfferAsync(next.Value, order.Id, order.OrderNumber, cancellationToken);
    }

    public async Task ProcessExpiredPendingOffersAsync(CancellationToken cancellationToken = default)
    {
        var deadline = DateTime.UtcNow.AddSeconds(-_opt.AcceptWindowSeconds);
        var stale = await _uow.Repository<Delivery, long>().Query
            .Include(d => d.Order)
            .ThenInclude(o => o.Restaurant)
            .Include(d => d.Order)
            .ThenInclude(o => o.CustomerAddress)
            .AsSplitQuery()
            .Where(d => d.Status == DeliveryDriverLeg.PendingAccept)
            .Where(d => d.OfferedAtUtc != null && d.OfferedAtUtc <= deadline)
            .ToListAsync(cancellationToken);
        if (stale.Count == 0)
            return;

        foreach (var delivery in stale)
        {
            var order = delivery.Order;
            var prevDriverId = delivery.DriverUserId;
            var profile = await _uow.Repository<DriverProfile, long>().Query
                .FirstOrDefaultAsync(p => p.UserId == prevDriverId, cancellationToken);
            if (profile is not null)
                profile.OffersTimedOutCount++;

            await AdvanceToNextDriverOrClearAsync(order, delivery, prevDriverId, cancellationToken);
        }
    }

    public async Task OnDriverDeclinedOfferAsync(long orderId, long driverUserId, CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .Include(o => o.CustomerAddress)
            .Include(o => o.Restaurant)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order?.Delivery is null)
            return;
        if (order.Delivery.DriverUserId != driverUserId)
            return;
        if (order.Delivery.Status != DeliveryDriverLeg.PendingAccept)
            return;

        var profile = await _uow.Repository<DriverProfile, long>().Query
            .FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);
        if (profile is not null)
            profile.OffersDeclinedCount++;

        await AdvanceToNextDriverOrClearAsync(order, order.Delivery, driverUserId, cancellationToken);
    }

    private async Task AdvanceToNextDriverOrClearAsync(
        Order order,
        Delivery delivery,
        long previousDriverId,
        CancellationToken cancellationToken)
    {
        var excluded = ExcludedDriverIdsJson.ToSet(delivery.AutoDispatchExcludedDriverIdsJson);
        excluded.Add(previousDriverId);
        delivery.AutoDispatchExcludedDriverIdsJson = ExcludedDriverIdsJson.FromSet(excluded);

        var next = await PickNextDriverUserIdAsync(order, excluded, cancellationToken);
        var now = DateTime.UtcNow;
        if (next is null)
        {
            _uow.Repository<Delivery, long>().Remove(delivery);
            order.Delivery = null;
            order.UpdatedAt = now;
        }
        else
        {
            delivery.DriverUserId = next.Value;
            delivery.Status = DeliveryDriverLeg.HeadingToRestaurant;
            delivery.OfferedAtUtc = now;
            delivery.AcceptedAtUtc = now;
            delivery.ArrivedAtRestaurantUtc = null;
            delivery.UpdatedAt = now;
            delivery.UpdatedById = null;
            order.UpdatedAt = now;
        }

        await _uow.SaveChangesAsync(cancellationToken);

        if (order.Delivery is { } d)
            await _realtime.NotifyDriverDeliveryOfferAsync(d.DriverUserId, order.Id, order.OrderNumber, cancellationToken);
    }

    private async Task<long?> PickNextDriverUserIdAsync(Order order, HashSet<long> excluded, CancellationToken cancellationToken)
    {
        var list = await BuildOrderedCandidateUserIdsAsync(order, excluded, cancellationToken);
        return list.Count > 0 ? list[0] : null;
    }

    private async Task<List<long>> BuildOrderedCandidateUserIdsAsync(
        Order order,
        HashSet<long> excluded,
        CancellationToken cancellationToken)
    {
        var driverRoleId = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .Where(r => r.Name == DbSeeder.DriverRoleName)
            .Select(r => (long?)r.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (driverRoleId is null)
            return new List<long>();

        var cutoff = DateTime.UtcNow.AddMinutes(-_opt.DriverLocationMaxAgeMinutes);
        var busy = await GetBusyDriverUserIdsForOtherOrdersAsync(order.Id, cancellationToken);

        var profiles = await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
            .Include(p => p.User)
            .Where(p => p.IsOnline && p.User.IsActive)
            .Where(p => p.User.UserRoles.Any(ur => ur.RoleId == driverRoleId.Value))
            .Where(p =>
                p.LastLatitude != null
                && p.LastLongitude != null
                && p.LastLocationAtUtc != null
                && p.LastLocationAtUtc >= cutoff)
            .ToListAsync(cancellationToken);

        var r = order.Restaurant;
        var hasRestaurantGeo = r.Latitude is not null && r.Longitude is not null;
        var radius = _opt.SearchRadiusKm;
        var maxTrip = _opt.MaxTotalTripKm;

        double? restaurantToCustomerKm = null;
        if (hasRestaurantGeo
            && order.CustomerAddress.Latitude is not null
            && order.CustomerAddress.Longitude is not null)
        {
            restaurantToCustomerKm = DriverGeo.DistanceKm(
                r.Latitude,
                r.Longitude,
                order.CustomerAddress.Latitude,
                order.CustomerAddress.Longitude);
        }

        var scored = new List<(long UserId, double DriverToRestaurantKm, double? DriverToCustomerKm)>();
        foreach (var p in profiles)
        {
            if (excluded.Contains(p.UserId) || busy.Contains(p.UserId))
                continue;

            if (!hasRestaurantGeo)
            {
                scored.Add((p.UserId, 0, null));
                continue;
            }

            var dDr = DriverGeo.DistanceKm(p.LastLatitude, p.LastLongitude, r.Latitude, r.Longitude);
            if (dDr is null)
                continue;

            if (maxTrip > 0 && restaurantToCustomerKm is double dRc && dDr.Value + dRc > maxTrip)
                continue;

            double? dDc = null;
            if (order.CustomerAddress.Latitude is not null && order.CustomerAddress.Longitude is not null)
            {
                dDc = DriverGeo.DistanceKm(
                    p.LastLatitude,
                    p.LastLongitude,
                    order.CustomerAddress.Latitude,
                    order.CustomerAddress.Longitude);
            }

            scored.Add((p.UserId, dDr.Value, dDc));
        }

        if (scored.Count == 0)
            return new List<long>();

        if (!hasRestaurantGeo)
            return scored.OrderBy(x => x.UserId).Select(x => x.UserId).ToList();

        var near = scored.Where(x => x.DriverToRestaurantKm <= radius).ToList();
        if (near.Count > 0)
            return near
                .OrderBy(x => x.DriverToRestaurantKm)
                .ThenBy(x => x.DriverToCustomerKm ?? double.MaxValue)
                .ThenBy(x => x.UserId)
                .Select(x => x.UserId)
                .ToList();

        return scored
            .OrderBy(x => x.DriverToRestaurantKm)
            .ThenBy(x => x.DriverToCustomerKm ?? double.MaxValue)
            .ThenBy(x => x.UserId)
            .Select(x => x.UserId)
            .ToList();
    }

    private async Task<HashSet<long>> GetBusyDriverUserIdsForOtherOrdersAsync(long currentOrderId, CancellationToken cancellationToken)
    {
        var ids = await _uow.Repository<Delivery, long>().Query.AsNoTracking()
            .Where(d => d.OrderId != currentOrderId)
            .Where(d => d.Order.Status != OrderStatus.Delivered && d.Order.Status != OrderStatus.Cancelled)
            .Select(d => d.DriverUserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        return ids.ToHashSet();
    }
}
