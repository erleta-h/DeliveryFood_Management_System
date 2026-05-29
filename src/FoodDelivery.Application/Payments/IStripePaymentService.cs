namespace FoodDelivery.Application.Payments;

public interface IStripePaymentService
{
    /// <summary>Kthen client secret për Stripe Elements; null nëse Stripe nuk është konfiguruar ose porosia nuk përshtatet.</summary>
    Task<(string? ClientSecret, string? Error)> CreatePaymentIntentForOrderAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default);

    Task HandleWebhookAsync(string json, string stripeSignature, CancellationToken cancellationToken = default);
    Task<string?> ConfirmAfterPaymentAsync(long userId, long orderId, CancellationToken cancellationToken = default);
}
