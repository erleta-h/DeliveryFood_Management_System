using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Coupons;
using FoodDelivery.Application.Delivery;
using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Realtime; // Shtuar për Realtime Notifier
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class OrdersService : IOrdersService
{
    private static readonly string[] AdminNotifyRoles = ["Admin", "Support"];

    private readonly IUnitOfWork _uow;
    private readonly IOrderRealtimeNotifier _realtime;
    private readonly INotificationPublisher _notifications;
    private readonly ICouponService _coupons;

    public OrdersService(
        IUnitOfWork uow,
        IOrderRealtimeNotifier realtime,
        INotificationPublisher notifications,
        ICouponService coupons)
    {
        _uow = uow;
        _realtime = realtime;
        _notifications = notifications;
        _coupons = coupons;
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

        var restaurant = await _uow.Repository<Restaurant, long>().Query
            .Include(r => r.DeliveryZone)
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Id == request.RestaurantId && r.IsActive && r.IsApproved,
                cancellationToken);

        if (restaurant is null)
            return (null, "Restoranti nuk eshte i disponueshem.");

        if (restaurant.DeliveryZone is { IsActive: false })
            return (null, "Zona e dergeses se restorantit nuk eshte aktive.");

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

        var minOrder = RestaurantDeliveryTerms.EffectiveMinOrderAmount(restaurant, restaurant.DeliveryZone);
        if (subtotal < minOrder)
            return (null, $"Shuma minimale e porosise eshte {minOrder:0.##} €.");

        var deliveryFee = RestaurantDeliveryTerms.EffectiveDeliveryFee(restaurant, restaurant.DeliveryZone);

        decimal discountTotal = 0;
        Coupon? appliedCoupon = null;
        if (!string.IsNullOrWhiteSpace(request.CouponCode))
        {
            var (coupon, preview, couponErr) = await _coupons.ResolveTrackedAsync(
                request.CouponCode,
                subtotal,
                cancellationToken);
            if (coupon is null || preview is null)
                return (null, couponErr ?? "Kuponi nuk u gjet.");

            appliedCoupon = coupon;
            discountTotal = preview.DiscountAmount;
        }

        var total = subtotal - discountTotal + deliveryFee;
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
            DiscountTotal = discountTotal,
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

        if (appliedCoupon is not null && discountTotal > 0)
        {
            _uow.Repository<OrderCoupon, long>().Add(new OrderCoupon
            {
                OrderId = order.Id,
                CouponId = appliedCoupon.Id,
                DiscountAmount = discountTotal,
                CreatedAt = now,
            });

            appliedCoupon.UsesCount += 1;
            appliedCoupon.UpdatedAt = now;
        }

        await _uow.SaveChangesAsync(cancellationToken);

        if (!useStripe)
        {
            await _realtime.NotifyRestaurantNewOrderAsync(
                order.Id,
                order.RestaurantId,
                cancellationToken);
        }

        await _notifications.NotifyUsersInRolesAsync(
            AdminNotifyRoles,
            "Porosi e re",
            $"{order.OrderNumber} — {restaurant.Name} ({total:F2} €)",
            NotificationTypes.OrderNew,
            cancellationToken);

        return (new PlaceOrderResponse(order.Id, useStripe), null);
    }

    public async Task<IReadOnlyList<CustomerOrderSummaryDto>> GetMyOrdersAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<Order, long>().Query.AsNoTracking()
            .Where(o => o.UserId == userId && o.CustomerHiddenAt == null)
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
                o.Delivery != null && o.Delivery.AcceptedAtUtc != null
                    && o.FulfillmentType != OrderFulfillmentType.Pickup))
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
            .Include(o => o.OrderCoupons)
                .ThenInclude(oc => oc.Coupon)
            .Include(o => o.Delivery)
                .ThenInclude(d => d!.Driver)
                    .ThenInclude(u => u.DriverProfile)
            .Include(o => o.Reviews)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);

        if (order is null)
            return null;

        var pendingStripePayment = order.Payments.Any(p =>
            p.Provider == "stripe" && p.Status == PaymentStatus.Pending);

        var delivery = order.Delivery;
        var chatAvailable = delivery?.AcceptedAtUtc != null
                            && order.FulfillmentType != OrderFulfillmentType.Pickup;
        var driverUser = delivery?.Driver;
        var driverProfile = driverUser?.DriverProfile;

        CustomerOrderDriverDto? driverDto = null;
        if (driverUser != null && delivery?.AcceptedAtUtc != null)
        {
            driverDto = new CustomerOrderDriverDto(
                driverUser.FirstName,
                driverUser.Phone,
                driverProfile?.VehicleType,
                driverProfile?.LicensePlate,
                null);
        }

        var items = order.Items
            .Select(i => new CustomerOrderItemDto(
                i.NameSnapshot,
                i.Quantity,
                i.UnitPrice,
                i.UnitPrice * i.Quantity))
            .ToList();

        string? cancellationReason = null;
        if (order.Status == OrderStatus.Cancelled)
        {
            cancellationReason = await _uow.Repository<OrderStatusHistory, long>().Query.AsNoTracking()
                .Where(h => h.OrderId == order.Id && h.Status == OrderStatus.Cancelled && h.Note != null)
                .OrderByDescending(h => h.CreatedAt)
                .Select(h => h.Note)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var reviewSlots = BuildReviewSlots(order, delivery, driverDto);

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
            order.DiscountTotal,
            order.OrderCoupons.FirstOrDefault()?.Coupon.Code,
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
            driverProfile?.LastLatitude,
            driverProfile?.LastLongitude,
            chatAvailable,
            delivery?.Status,
            pendingStripePayment,
            driverDto,
            cancellationReason,
            reviewSlots);
    }

    public async Task<(SubmitOrderReviewResponse? Response, string? Error)> SubmitOrderReviewAsync(
        long userId,
        long orderId,
        SubmitOrderReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Rating is < 1 or > 5)
            return (null, "Zgjidhni nga 1 deri 5 yje.");

        var comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
        if (comment is { Length: > 2000 })
            return (null, "Komenti është shumë i gjatë (max 2000 karaktere).");

        if (request.Subject is not (ReviewSubjectKind.Restaurant or ReviewSubjectKind.Driver))
            return (null, "Subjekti i vlerësimit nuk është i vlefshëm.");

        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Restaurant)
            .Include(o => o.Delivery)
            .Include(o => o.Reviews)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);

        if (order is null)
            return (null, "Porosia nuk u gjet.");

        if (order.Status != OrderStatus.Delivered)
            return (null, "Vlerësimi hapet vetëm pas dorëzimit të porosisë.");

        if (order.Reviews.Any(r => r.Subject == request.Subject))
            return (null, "E keni vlerësuar këtë pjesë të porosisë tashmë.");

        if (request.Subject == ReviewSubjectKind.Driver)
        {
            if (order.FulfillmentType != OrderFulfillmentType.Delivery)
                return (null, "Porositë me marrje në restorant nuk vlerësojnë deliverin.");

            if (order.Delivery is null || order.Delivery.AcceptedAtUtc is null)
                return (null, "Nuk ka deliver për këtë porosi.");
        }

        var now = DateTime.UtcNow;
        var review = new Review
        {
            AuthorUserId = userId,
            OrderId = order.Id,
            RestaurantId = order.RestaurantId,
            DriverUserId = request.Subject == ReviewSubjectKind.Driver ? order.Delivery!.DriverUserId : null,
            Subject = request.Subject,
            Rating = request.Rating,
            Comment = comment,
            Status = ReviewModerationStatus.Public,
            ReportCount = 0,
            CreatedAt = now,
            CreatedById = userId,
        };

        _uow.Repository<Review, long>().Add(review);

        if (request.Subject == ReviewSubjectKind.Restaurant)
            await RefreshRestaurantReviewStatsAsync(order.RestaurantId, cancellationToken);

        await _uow.SaveChangesAsync(cancellationToken);

        return (new SubmitOrderReviewResponse(review.Id), null);
    }

    private static IReadOnlyList<CustomerOrderReviewSlotDto> BuildReviewSlots(
        Order order,
        Delivery? delivery,
        CustomerOrderDriverDto? driverDto)
    {
        var delivered = order.Status == OrderStatus.Delivered;
        var restaurantReview = order.Reviews.FirstOrDefault(r => r.Subject == ReviewSubjectKind.Restaurant);
        var slots = new List<CustomerOrderReviewSlotDto>
        {
            new(
                ReviewSubjectKind.Restaurant,
                order.Restaurant.Name,
                "Si ishte ushqimi dhe shërbimi i restorantit?",
                delivered && restaurantReview is null,
                restaurantReview is not null,
                restaurantReview?.Rating,
                restaurantReview?.Comment),
        };

        if (order.FulfillmentType == OrderFulfillmentType.Delivery
            && delivery?.AcceptedAtUtc != null)
        {
            var driverReview = order.Reviews.FirstOrDefault(r => r.Subject == ReviewSubjectKind.Driver);
            var driverName = driverDto?.DisplayName?.Trim();
            if (string.IsNullOrEmpty(driverName))
                driverName = "Deliveri";

            slots.Add(new CustomerOrderReviewSlotDto(
                ReviewSubjectKind.Driver,
                driverName,
                "Si ishte dërgesa dhe komunikimi?",
                delivered && driverReview is null,
                driverReview is not null,
                driverReview?.Rating,
                driverReview?.Comment));
        }

        return slots;
    }

    private async Task RefreshRestaurantReviewStatsAsync(long restaurantId, CancellationToken cancellationToken)
    {
        var q = _uow.Repository<Review, long>().Query
            .Where(r =>
                r.RestaurantId == restaurantId &&
                r.Subject == ReviewSubjectKind.Restaurant &&
                r.Status == ReviewModerationStatus.Public);

        var count = await q.CountAsync(cancellationToken);
        var avg = count > 0
            ? (decimal)await q.AverageAsync(r => (double)r.Rating, cancellationToken)
            : 0m;

        var restaurant = await _uow.Repository<Restaurant, long>().Query
            .FirstOrDefaultAsync(r => r.Id == restaurantId, cancellationToken);

        if (restaurant is null)
            return;

        restaurant.ReviewCount = count;
        restaurant.AverageRating = count > 0 ? Math.Round(avg, 1) : 0m;
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

    public async Task<bool> HideOrderFromCustomerHistoryAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _uow.Repository<Order, long>().Query
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);

        if (order is null)
            return false;

        if (order.CustomerHiddenAt is null)
        {
            order.CustomerHiddenAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedById = userId;
            await _uow.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}