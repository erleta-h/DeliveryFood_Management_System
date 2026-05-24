using System.Globalization;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Payments;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;

namespace FoodDelivery.Infrastructure.Payments;

public sealed class StripePaymentService : IStripePaymentService
{
    private readonly IUnitOfWork _uow;
    private readonly StripeSettings _stripe;
    private readonly IOrderRealtimeNotifier _realtime;

    public StripePaymentService(
        IUnitOfWork uow,
        IOptions<StripeSettings> stripe,
        IOrderRealtimeNotifier realtime)
    {
        _uow = uow;
        _stripe = stripe.Value;
        _realtime = realtime;
    }

    public async Task<(string? ClientSecret, string? Error)> CreatePaymentIntentForOrderAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_stripe.SecretKey))
            return (null, "Stripe nuk është konfiguruar në server.");

        StripeConfiguration.ApiKey = _stripe.SecretKey;

        var order = await _uow.Repository<Order, long>().Query
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);

        if (order is null)
            return (null, "Porosia nuk u gjet.");

        var payment = order.Payments.FirstOrDefault(
            p => p.Provider == "stripe" && p.Status == PaymentStatus.Pending);

        if (payment is null)
            return (null, "Kjo porosi nuk përdor pagesë me kartë ose pagesa është përpunuar.");

        var service = new PaymentIntentService();

        if (!string.IsNullOrEmpty(payment.ExternalId))
        {
            var existing = await service.GetAsync(
                payment.ExternalId,
                cancellationToken: cancellationToken);

            if (existing.Status == "succeeded")
                return (null, "Pagesa është kryer.");

            return (existing.ClientSecret, null);
        }

        var amountCents = (long)Math.Round(
            payment.Amount * 100m,
            MidpointRounding.AwayFromZero);

        var options = new PaymentIntentCreateOptions
        {
            Amount = amountCents,
            Currency = (payment.Currency ?? "eur").ToLowerInvariant(),
            Metadata = new Dictionary<string, string>
            {
                ["orderId"] = order.Id.ToString(CultureInfo.InvariantCulture),
            },
            AutomaticPaymentMethods =
                new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true
                },
        };

        PaymentIntent intent;
        try
        {
            intent = await service.CreateAsync(options, cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            return (null, ex.StripeError?.Message ?? ex.Message);
        }

        payment.ExternalId = intent.Id;
        payment.UpdatedAt = DateTime.UtcNow;

        await _uow.SaveChangesAsync(cancellationToken);

        return (intent.ClientSecret, null);
    }

    public async Task HandleWebhookAsync(
        string json,
        string stripeSignature,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_stripe.SecretKey) ||
            string.IsNullOrWhiteSpace(_stripe.WebhookSecret))
        {
            throw new InvalidOperationException(
                "Stripe ose webhook secret mungon.");
        }

        StripeConfiguration.ApiKey = _stripe.SecretKey;

        var stripeEvent = EventUtility.ConstructEvent(
            json,
            stripeSignature,
            _stripe.WebhookSecret,
            throwOnApiVersionMismatch: false);

        if (stripeEvent.Type == EventTypes.PaymentIntentSucceeded)
        {
            if (stripeEvent.Data.Object is PaymentIntent pi)
            {
                await MarkStripePaymentCapturedAsync(
                    pi.Id,
                    pi.Status,
                    cancellationToken);
            }

            return;
        }

        if (stripeEvent.Type == EventTypes.PaymentIntentPaymentFailed)
        {
            if (stripeEvent.Data.Object is PaymentIntent failed)
            {
                var payment = await _uow.Repository<Payment, long>().Query
                    .Include(p => p.Order)
                    .FirstOrDefaultAsync(
                        p => p.ExternalId == failed.Id,
                        cancellationToken);

                if (payment is { Provider: "stripe", Order: { } order })
                {
                    payment.Status = PaymentStatus.Failed;
                    payment.UpdatedAt = DateTime.UtcNow;
                    payment.RawPayload = failed.LastPaymentError?.Message;

                    var cancelled = false;

                    if (order.Status == OrderStatus.Pending)
                    {
                        var now = DateTime.UtcNow;

                        order.Status = OrderStatus.Cancelled;
                        order.UpdatedAt = now;
                        order.UpdatedById = null;

                        _uow.Repository<OrderStatusHistory, long>().Add(
                            new OrderStatusHistory
                            {
                                OrderId = order.Id,
                                Status = OrderStatus.Cancelled,
                                Note = "stripe:payment_failed",
                                CreatedAt = now,
                                CreatedById = null,
                            });

                        cancelled = true;
                    }

                    await _uow.SaveChangesAsync(cancellationToken);

                    if (cancelled)
                    {
                        await _realtime.NotifyOrderStatusChangedAsync(
                            order.Id,
                            OrderStatus.Cancelled,
                            order.RestaurantId,
                            order.UserId,
                            order.OrderNumber,
                            cancellationToken);
                       // await AdminDashboardCacheInvalidation.InvalidateAsync(_cache, cancellationToken)
                           // .ConfigureAwait(false);
                    }
                }
            }
        }
    }

    private async Task MarkStripePaymentCapturedAsync(
        string? externalId,
        string? status,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(externalId))
            return;

        var payment = await _uow.Repository<Payment, long>().Query
            .FirstOrDefaultAsync(
                p => p.ExternalId == externalId,
                cancellationToken);

        if (payment is not { Provider: "stripe" })
            return;

        if (payment.Status == PaymentStatus.Captured)
            return;

        var wasPending = payment.Status == PaymentStatus.Pending;

        payment.Status = PaymentStatus.Captured;
        payment.UpdatedAt = DateTime.UtcNow;
        payment.RawPayload = status;

        await _uow.SaveChangesAsync(cancellationToken);

        if (!wasPending)
            return;

        var restaurantId = await _uow.Repository<Order, long>().Query
            .AsNoTracking()
            .Where(o => o.Id == payment.OrderId)
            .Select(o => o.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);
        await _realtime.NotifyRestaurantNewOrderAsync(payment.OrderId, restaurantId, cancellationToken);
        //await AdminDashboardCacheInvalidation.InvalidateAsync(_cache, cancellationToken).ConfigureAwait(false);
    }
}