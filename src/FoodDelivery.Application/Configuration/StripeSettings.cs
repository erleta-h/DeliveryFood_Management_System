namespace FoodDelivery.Application.Configuration;

public sealed class StripeSettings
{
    public const string SectionName = "Stripe";

    public string? SecretKey { get; set; }
    public string? WebhookSecret { get; set; }
    /// <summary>Celës publik për Stripe.js (i njëjtë llogari si SecretKey).</summary>
    public string? PublishableKey { get; set; }
}
