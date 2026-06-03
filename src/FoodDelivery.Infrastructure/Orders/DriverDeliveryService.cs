using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class DriverDeliveryService : IDriverDeliveryService
{
    private readonly IUnitOfWork _uow;
    private readonly IDeliveryAutoDispatchService _autoDispatch;
    private readonly DeliveryDispatchSettings _dispatch;
    private readonly IOrderRealtimeNotifier _realtime;

    public DriverDeliveryService(
        IUnitOfWork uow,
        IDeliveryAutoDispatchService autoDispatch,
        IOptions<DeliveryDispatchSettings> dispatchOptions,
        IOrderRealtimeNotifier realtime)
    {
        _uow = uow;
        _autoDispatch = autoDispatch;
        _dispatch = dispatchOptions.Value;
        _realtime = realtime;
    }

    public async Task<DriverStatusDto> GetStatusAsync(long driverUserId, CancellationToken cancellationToken = default)
    {
        var profile = await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);
        var utcNow = DateTime.UtcNow;

        var isBusy = await _uow.Repository<Delivery, long>().Query.AsNoTracking()
            .AnyAsync(
                d => d.DriverUserId == driverUserId
                     && d.Order.FulfillmentType == OrderFulfillmentType.Delivery
                     && d.Order.Status != OrderStatus.Delivered
                     && d.Order.Status != OrderStatus.Cancelled,
                cancellationToken);

        var secondsToday = profile?.OnlineSecondsToday ?? 0;
        if (profile?.OnlineTallyDateUtc is null || profile.OnlineTallyDateUtc.Value.Date < utcNow.Date)
            secondsToday = 0;

        if (profile?.IsOnline == true && profile.OnlineSinceUtc is not null)
            secondsToday += (int)Math.Max(0, (utcNow - profile.OnlineSinceUtc.Value).TotalSeconds);

        return new DriverStatusDto(
            profile?.IsOnline ?? false,
            isBusy,
            secondsToday,
            profile?.IsOnline == true ? profile.OnlineSinceUtc : null,
            profile?.LastLatitude,
            profile?.LastLongitude,
            profile?.LastLocationAtUtc);
    }

    public async Task<string?> SetOnlineAsync(long driverUserId, CancellationToken cancellationToken = default)
    {
        var profile = await _uow.Repository<DriverProfile, long>().Query.FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);
        if (profile is null)
            return "Profili Deliver nuk u gjet.";

        var utcNow = DateTime.UtcNow;
        RollOnlineDayIfNeeded(profile, utcNow);

        if (profile.IsOnline)
            return null;

        profile.IsOnline = true;
        profile.OnlineSinceUtc = utcNow;
        profile.UpdatedAt = utcNow;
        profile.UpdatedById = driverUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> SetOfflineAsync(long driverUserId, CancellationToken cancellationToken = default)
    {
        var profile = await _uow.Repository<DriverProfile, long>().Query.FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);
        if (profile is null)
            return "Profili Deliver nuk u gjet.";

        var utcNow = DateTime.UtcNow;
        RollOnlineDayIfNeeded(profile, utcNow);

        if (!profile.IsOnline)
            return null;

        if (profile.OnlineSinceUtc is not null)
            profile.OnlineSecondsToday += (int)Math.Max(0, (utcNow - profile.OnlineSinceUtc.Value).TotalSeconds);

        profile.IsOnline = false;
        profile.OnlineSinceUtc = null;
        profile.UpdatedAt = utcNow;
        profile.UpdatedById = driverUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task PostLocationAsync(
        long driverUserId,
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        var profile = await _uow.Repository<DriverProfile, long>().Query.FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);
        if (profile is null)
            return;

        var utcNow = DateTime.UtcNow;
        profile.LastLatitude = latitude;
        profile.LastLongitude = longitude;
        profile.LastLocationAtUtc = utcNow;
        profile.UpdatedAt = utcNow;
        profile.UpdatedById = driverUserId;
        await _uow.SaveChangesAsync(cancellationToken);

        var activeOrderIds = await _uow.Repository<Delivery, long>().Query.AsNoTracking()
            .Where(d => d.DriverUserId == driverUserId)
            .Where(d => d.Status != DeliveryDriverLeg.PendingAccept)
            .Where(d => d.Order.FulfillmentType == OrderFulfillmentType.Delivery)
            .Where(d => d.Order.Status != OrderStatus.Delivered && d.Order.Status != OrderStatus.Cancelled)
            .Select(d => d.OrderId)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var oid in activeOrderIds)
            await _realtime.NotifyDriverLocationAsync(oid, latitude, longitude, cancellationToken);
    }

    public async Task<IReadOnlyList<DriverDeliveryRowDto>> GetMyActiveDeliveriesAsync(
        long driverUserId,
        CancellationToken cancellationToken = default)
    {
        await ExpireStaleOffersAsync(cancellationToken);

        var list = await _uow.Repository<Delivery, long>().Query
            .AsNoTracking()
            .Include(d => d.Order)
            .ThenInclude(o => o.Restaurant)
            .Include(d => d.Order)
            .ThenInclude(o => o.CustomerAddress)
            .Include(d => d.Order)
            .ThenInclude(o => o.User)
            .Include(d => d.Order)
            .ThenInclude(o => o.Payments)
            .Where(d => d.DriverUserId == driverUserId)
            .Where(d => d.Order.FulfillmentType == OrderFulfillmentType.Delivery)
            .Where(d => d.Order.Status != OrderStatus.Delivered && d.Order.Status != OrderStatus.Cancelled)
            .OrderByDescending(d => d.Order.PlacedAt)
            .ToListAsync(cancellationToken);

        var profile = await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);

        var utcNow = DateTime.UtcNow;
        return list.Select(d => MapRow(d, profile, utcNow)).ToList();
    }

    public async Task<DriverActiveOrderDetailDto?> GetActiveOrderDetailAsync(
        long driverUserId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        await ExpireStaleOffersAsync(cancellationToken);

        var order = await _uow.Repository<Order, long>().Query
            .AsNoTracking()
            .Include(o => o.Delivery)
            .Include(o => o.Restaurant)
            .Include(o => o.CustomerAddress)
            .Include(o => o.User)
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(
                o => o.Id == orderId && o.Delivery != null && o.Delivery.DriverUserId == driverUserId,
                cancellationToken);

        if (order is null || order.FulfillmentType != OrderFulfillmentType.Delivery)
            return null;
        if (order.Status == OrderStatus.Delivered || order.Status == OrderStatus.Cancelled)
            return null;

        var d = order.Delivery!;
        var (payLabel, cashCollect, cashAmount) = PaymentInfo(order);
        return new DriverActiveOrderDetailDto(
            order.Id,
            order.OrderNumber,
            order.Status,
            d.Status,
            order.CustomerNotes,
            order.PlacedAt,
            order.Subtotal,
            order.DeliveryFee,
            order.Total,
            payLabel,
            cashCollect,
            cashAmount,
            new DriverPartyDto(
                order.Restaurant.Name,
                order.Restaurant.AddressLine ?? "",
                order.Restaurant.City ?? "",
                null,
                order.Restaurant.Latitude,
                order.Restaurant.Longitude,
                order.Restaurant.Phone),
            new DriverPartyDto(
                $"{order.User.FirstName} {order.User.LastName}".Trim(),
                order.CustomerAddress.Line1,
                order.CustomerAddress.City,
                order.CustomerAddress.PostalCode,
                order.CustomerAddress.Latitude,
                order.CustomerAddress.Longitude,
                order.User.Phone),
            order.Items
                .Select(i => new DriverOrderLineDto(i.NameSnapshot, i.Quantity, i.UnitPrice))
                .ToList());
    }

    public async Task<string?> AcceptOfferAsync(long driverUserId, long orderId, CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null || order.Delivery is null || order.Delivery.DriverUserId != driverUserId)
            return "Porosia nuk u gjet.";
        if (order.Delivery.Status != DeliveryDriverLeg.PendingAccept)
            return "Oferta është trajtuar tashmë.";
        if (order.Delivery.OfferedAtUtc is { } offered
            && DateTime.UtcNow > offered.AddSeconds(_dispatch.AcceptWindowSeconds))
            return "Afati për pranim ka skaduar.";

        var now = DateTime.UtcNow;
        order.Delivery.Status = DeliveryDriverLeg.HeadingToRestaurant;
        order.Delivery.AcceptedAtUtc = now;
        order.Delivery.UpdatedAt = now;
        order.Delivery.UpdatedById = driverUserId;

        var profile = await _uow.Repository<DriverProfile, long>().Query.FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);
        if (profile is not null)
            profile.OffersAcceptedCount++;

        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> DeclineOfferAsync(long driverUserId, long orderId, CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null || order.Delivery is null || order.Delivery.DriverUserId != driverUserId)
            return "Porosia nuk u gjet.";
        if (order.Delivery.Status != DeliveryDriverLeg.PendingAccept)
            return "Nuk mund të refuzosh këtë fazë.";

        await _autoDispatch.OnDriverDeclinedOfferAsync(orderId, driverUserId, cancellationToken);
        return null;
    }

    public async Task<string?> MarkArrivedAtRestaurantAsync(
        long driverUserId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null || order.Delivery is null || order.Delivery.DriverUserId != driverUserId)
            return "Porosia nuk u gjet.";
        if (order.FulfillmentType != OrderFulfillmentType.Delivery)
            return "Ky veprim vlen vetëm për dërgesë.";
        if (order.Delivery.Status != DeliveryDriverLeg.HeadingToRestaurant)
            return "Së pari nisu drejt restorantit (ose prano ofertën).";
        if (order.Status != OrderStatus.ReadyForPickup)
            return "Porosia nuk është ende «gati për marrje».";

        var now = DateTime.UtcNow;
        order.Delivery.Status = DeliveryDriverLeg.AtRestaurant;
        order.Delivery.ArrivedAtRestaurantUtc = now;
        order.Delivery.UpdatedAt = now;
        order.Delivery.UpdatedById = driverUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> MarkPickedUpAsync(
        long driverUserId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return "Porosia nuk u gjet.";
        if (order.FulfillmentType != OrderFulfillmentType.Delivery)
            return "Ky veprim vlen vetëm për dërgesë.";
        if (order.Status != OrderStatus.ReadyForPickup)
            return "Porosia nuk është «gati për marrje» nga restoranti.";
        if (order.Delivery is null || order.Delivery.DriverUserId != driverUserId)
            return "Nuk je caktuar për këtë porosi.";
        if (order.Delivery.Status != DeliveryDriverLeg.AtRestaurant)
            return "Së pari konfirmo «Arrita te restoranti».";

        var now = DateTime.UtcNow;
        order.Status = OrderStatus.OutForDelivery;
        order.UpdatedAt = now;
        order.UpdatedById = driverUserId;
        order.Delivery.PickedUpAt = now;
        order.Delivery.Status = DeliveryDriverLeg.EnRouteToCustomer;
        order.Delivery.UpdatedAt = now;
        order.Delivery.UpdatedById = driverUserId;

        _uow.Repository<OrderStatusHistory, long>().Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = OrderStatus.OutForDelivery,
            CreatedAt = now,
            CreatedById = driverUserId,
            Note = "Marrë nga Deliver",
        });

        await _uow.SaveChangesAsync(cancellationToken);

        await _realtime.NotifyOrderStatusChangedAsync(
            order.Id,
            OrderStatus.OutForDelivery,
            order.RestaurantId,
            order.UserId,
            order.OrderNumber,
            null,
            cancellationToken);

        return null;
    }

    public async Task<string?> MarkDeliveredAsync(
        long driverUserId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Delivery)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return "Porosia nuk u gjet.";
        if (order.FulfillmentType != OrderFulfillmentType.Delivery)
            return "Ky veprim vlen vetëm për dërgesë.";
        if (order.Status != OrderStatus.OutForDelivery)
            return "Porosia nuk është në dërgesë.";
        if (order.Delivery is null || order.Delivery.DriverUserId != driverUserId)
            return "Nuk je caktuar për këtë porosi.";
        if (order.Delivery.Status != DeliveryDriverLeg.EnRouteToCustomer)
            return "Statusi i dërgesës nuk përputhet.";

        var now = DateTime.UtcNow;
        order.Status = OrderStatus.Delivered;
        order.UpdatedAt = now;
        order.UpdatedById = driverUserId;
        order.Delivery.DeliveredAt = now;
        order.Delivery.Status = DeliveryDriverLeg.Completed;
        order.Delivery.UpdatedAt = now;
        order.Delivery.UpdatedById = driverUserId;

        _uow.Repository<OrderStatusHistory, long>().Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = OrderStatus.Delivered,
            CreatedAt = now,
            CreatedById = driverUserId,
            Note = "Dorëzuar nga Deliver",
        });

        await _uow.SaveChangesAsync(cancellationToken);

        await _realtime.NotifyOrderStatusChangedAsync(
            order.Id,
            OrderStatus.Delivered,
            order.RestaurantId,
            order.UserId,
            order.OrderNumber,
            null,
            cancellationToken);

        return null;
    }

    public async Task<DriverEarningsDto> GetEarningsAsync(long driverUserId, CancellationToken cancellationToken = default)
    {
        var startToday = DateTime.UtcNow.Date;
        var endToday = startToday.AddDays(1);
        var startWeek = startToday.AddDays(-7);

        var baseQ = _uow.Repository<Delivery, long>().Query.AsNoTracking()
            .Where(d => d.DriverUserId == driverUserId)
            .Where(d => d.DeliveredAt != null)
            .Where(d => d.Order.Status == OrderStatus.Delivered);

        var today = await baseQ
            .Where(d => d.DeliveredAt >= startToday && d.DeliveredAt < endToday)
            .Select(d => new { d.Order.DeliveryFee })
            .ToListAsync(cancellationToken);

        var week = await baseQ
            .Where(d => d.DeliveredAt >= startWeek && d.DeliveredAt < endToday)
            .Select(d => new { d.Order.DeliveryFee })
            .ToListAsync(cancellationToken);

        return new DriverEarningsDto(
            today.Sum(x => x.DeliveryFee),
            today.Count,
            week.Sum(x => x.DeliveryFee),
            week.Count,
            0m);
    }

    public async Task<IReadOnlyList<DriverHistoryRowDto>> GetHistoryAsync(
        long driverUserId,
        int take,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 100);

        var rows = await _uow.Repository<Delivery, long>().Query
            .AsNoTracking()
            .Where(d => d.DriverUserId == driverUserId && d.DeliveredAt != null)
            .OrderByDescending(d => d.DeliveredAt)
            .Take(take)
            .Select(d => new
            {
                d.OrderId,
                d.Order.OrderNumber,
                DeliveredAt = d.DeliveredAt!.Value,
                d.Order.DeliveryFee,
            })
            .ToListAsync(cancellationToken);

        var orderIds = rows.Select(r => r.OrderId).ToList();
        var ratings = await _uow.Repository<Review, long>().Query.AsNoTracking()
            .Where(r => r.DriverUserId == driverUserId && orderIds.Contains(r.OrderId))
            .Select(r => new { r.OrderId, r.Rating })
            .ToListAsync(cancellationToken);

        var ratingByOrder = ratings
            .GroupBy(r => r.OrderId)
            .ToDictionary(g => g.Key, g => g.First().Rating);

        return rows
            .Select(r => new DriverHistoryRowDto(
                r.OrderId,
                r.OrderNumber,
                r.DeliveredAt,
                r.DeliveryFee,
                ratingByOrder.TryGetValue(r.OrderId, out var rt) ? rt : null))
            .ToList();
    }

    public async Task<DriverPerformanceDto> GetPerformanceAsync(long driverUserId, CancellationToken cancellationToken = default)
    {
        var profile = await _uow.Repository<DriverProfile, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);

        var reviews = await _uow.Repository<Review, long>().Query.AsNoTracking()
            .Where(r => r.DriverUserId == driverUserId)
            .Select(r => r.Rating)
            .ToListAsync(cancellationToken);

        var avg = reviews.Count > 0 ? reviews.Average(x => (double)x) : 0d;
        var acc = profile?.OffersAcceptedCount ?? 0;
        var dec = profile?.OffersDeclinedCount ?? 0;
        var to = profile?.OffersTimedOutCount ?? 0;
        var denom = acc + dec + to;
        var acceptPct = denom > 0 ? 100.0 * acc / denom : 100.0;
        var declinePct = denom > 0 ? 100.0 * (dec + to) / denom : 0.0;

        string? hint = null;
        if (denom >= 5 && acceptPct < 70)
            hint = "Pranimi i ofertave është nën 70%. Provo t’i pranosh më shpejt për të ruajtur prioritetin.";
        if (reviews.Count >= 3 && avg < 4.0)
            hint = string.IsNullOrEmpty(hint)
                ? "Vlerësimi mesatar po bie — kontrollo komunikimin me klientin."
                : hint + " Vlerësimi mesatar është i ulët.";

        return new DriverPerformanceDto(
            Math.Round(avg, 2),
            reviews.Count,
            Math.Round(acceptPct, 1),
            Math.Round(declinePct, 1),
            acc,
            dec,
            to,
            hint);
    }

    public async Task<IReadOnlyList<DriverNotificationRowDto>> GetNotificationsAsync(
        long driverUserId,
        int take,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 50);
        return await _uow.Repository<Notification, long>().Query
            .AsNoTracking()
            .Where(n => n.UserId == driverUserId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .Select(n => new DriverNotificationRowDto(
                n.Id,
                n.Title,
                n.Message,
                n.Type,
                n.CreatedAt,
                n.IsRead))
            .ToListAsync(cancellationToken);
    }

    public async Task<DriverAccountProfileDto?> GetDriverAccountAsync(
        long driverUserId,
        CancellationToken cancellationToken = default)
    {
        var profile = await _uow.Repository<DriverProfile, long>().Query
            .AsNoTracking()
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == driverUserId, cancellationToken);
        if (profile is null)
            return null;

        var addr = await _uow.Repository<CustomerAddress, long>().Query.AsNoTracking()
            .Where(a => a.UserId == driverUserId)
            .OrderByDescending(a => a.IsDefault)
            .ThenBy(a => a.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var earnings = await GetEarningsAsync(driverUserId, cancellationToken);
        var perf = await GetPerformanceAsync(driverUserId, cancellationToken);

        var hasVehicle = !string.IsNullOrWhiteSpace(profile.VehicleType)
                         && !string.IsNullOrWhiteSpace(profile.LicensePlate);
        var verificationStatus = hasVehicle ? "complete" : "incomplete";
        var verificationSummary = hasVehicle
            ? "Mjeti dhe targa janë të regjistruara. Ndryshimet i konfirmon administratori nëse nevojitet."
            : "Plotëso të dhënat e mjetit me administratorin / support — pa targë të verifikuar disa veprime mund të kufizohen.";

        var utcNow = DateTime.UtcNow;
        string? gpsHint;
        if (profile.LastLocationAtUtc is { } lastGps)
        {
            var age = utcNow - lastGps;
            if (age.TotalMinutes < 2)
                gpsHint = "Vendndodhja: sapo u përditësua.";
            else if (age.TotalMinutes <= 30)
                gpsHint = $"Vendndodhja e fundit: para ~{(int)age.TotalMinutes} min.";
            else if (profile.IsOnline)
                gpsHint = "Je Online — GPS rifreskohet kur lëvizësh (kontrollo lejet e shfletuesit).";
            else
                gpsHint = "Ndiz «Online» në panelin kryesor dhe lejo GPS për oferta më të sakta.";
        }
        else
        {
            gpsHint = profile.IsOnline
                ? "Duke pritur sinjal GPS nga pajisja jote…"
                : "Për distanca dhe oferta, ndiz «Online» dhe lejo aksesin e vendndodhjes.";
        }

        string? nextStep = null;
        if (string.IsNullOrWhiteSpace(profile.User.Phone))
            nextStep = "Shto një numër telefoni të vlefshëm — klienti dhe restoranti duhet të të kontaktojnë gjatë porosisë.";
        else if (!hasVehicle)
            nextStep = "Kontakto support-in për të verifikuar targën dhe llojin e mjetit nëse mungojnë.";
        else if (!string.IsNullOrEmpty(perf.PerformanceHint))
            nextStep = perf.PerformanceHint;

        return new DriverAccountProfileDto(
            profile.User.FirstName,
            profile.User.LastName,
            profile.User.Email,
            profile.User.Phone ?? string.Empty,
            addr?.Line1 ?? string.Empty,
            addr?.City ?? string.Empty,
            addr?.PostalCode,
            profile.VehicleType,
            profile.LicensePlate,
            profile.CreatedAt,
            profile.IsOnline,
            verificationStatus,
            verificationSummary,
            earnings.TodayTotal,
            earnings.TodayDeliveriesCount,
            earnings.WeekTotal,
            earnings.WeekDeliveriesCount,
            perf.AverageRating,
            perf.RatingsCount,
            perf.AcceptanceRatePercent,
            gpsHint,
            nextStep);
    }

    private Task ExpireStaleOffersAsync(CancellationToken cancellationToken) =>
        _autoDispatch.ProcessExpiredPendingOffersAsync(cancellationToken);

    private static void RollOnlineDayIfNeeded(DriverProfile profile, DateTime utcNow)
    {
        var today = utcNow.Date;
        if (profile.OnlineTallyDateUtc is null || profile.OnlineTallyDateUtc.Value.Date < today)
        {
            profile.OnlineSecondsToday = 0;
            profile.OnlineTallyDateUtc = today;
        }
    }

    private DriverDeliveryRowDto MapRow(
        Delivery d,
        DriverProfile? profile,
        DateTime utcNow)
    {
        var o = d.Order;
        var r = o.Restaurant;
        var c = o.CustomerAddress;
        var u = o.User;

        int? acceptLeft = null;
        if (d.Status == DeliveryDriverLeg.PendingAccept && d.OfferedAtUtc is { } off)
        {
            var left = _dispatch.AcceptWindowSeconds - (int)(utcNow - off).TotalSeconds;
            acceptLeft = Math.Max(0, left);
        }

        var distToR = DriverGeo.DistanceKm(profile?.LastLatitude, profile?.LastLongitude, r.Latitude, r.Longitude);
        var distRc = DriverGeo.DistanceKm(r.Latitude, r.Longitude, c.Latitude, c.Longitude);

        var (payLabel, cashCollect, _) = PaymentInfo(o);
        var eta = Math.Max(5, r.EstimatedDeliveryMinutes);

        var requiresAccept = d.Status == DeliveryDriverLeg.PendingAccept;
        var canArrive = d.Status == DeliveryDriverLeg.HeadingToRestaurant && o.Status == OrderStatus.ReadyForPickup;
        var canPickup = d.Status == DeliveryDriverLeg.AtRestaurant && o.Status == OrderStatus.ReadyForPickup;
        var canDeliver = d.Status == DeliveryDriverLeg.EnRouteToCustomer && o.Status == OrderStatus.OutForDelivery;

        return new DriverDeliveryRowDto(
            o.Id,
            o.OrderNumber,
            r.Name,
            r.AddressLine ?? "",
            r.City ?? "",
            r.Phone,
            r.Latitude,
            r.Longitude,
            c.Line1,
            c.City,
            c.PostalCode,
            c.Latitude,
            c.Longitude,
            u.FirstName,
            u.LastName,
            u.Phone,
            o.Status,
            d.Status,
            o.CustomerNotes,
            o.ContactPhone ?? "",
            o.PlacedAt,
            d.OfferedAtUtc,
            requiresAccept ? acceptLeft : null,
            distToR,
            distRc,
            o.DeliveryFee,
            eta,
            requiresAccept,
            canArrive,
            canPickup,
            canDeliver,
            o.Total,
            payLabel,
            cashCollect);
    }

    private static (string Label, bool CashCollect, decimal? CashAmount) PaymentInfo(Order o)
    {
        var p = o.Payments.FirstOrDefault();
        var isCod = p is { Provider: "cod" };
        var label = isCod ? "Cash (në dorëzim)" : "Kartë / online";
        var cash = isCod && p?.Status == PaymentStatus.Pending;
        return (label, cash, cash ? o.Total : null);
    }
}
