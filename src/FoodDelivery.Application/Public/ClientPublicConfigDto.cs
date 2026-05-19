namespace FoodDelivery.Application.Public;

/// <summary>Celësa të sigurt për klientin (browser key, Stripe publishable, VAPID publik).</summary>
public record ClientPublicConfigDto(
    string? GoogleMapsBrowserApiKey,
    string? StripePublishableKey,
    string? WebPushVapidPublicKey);
