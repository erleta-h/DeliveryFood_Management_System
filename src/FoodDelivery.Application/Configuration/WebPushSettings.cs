namespace FoodDelivery.Application.Configuration;

public sealed class WebPushSettings
{
    public const string SectionName = "WebPush";

    public string? VapidPublicKey { get; set; }
    public string? VapidPrivateKey { get; set; }
    /// <summary>p.sh. mailto:support@example.com</summary>
    public string? VapidSubject { get; set; }
}
