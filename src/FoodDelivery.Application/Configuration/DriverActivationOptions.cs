namespace FoodDelivery.Application.Configuration;

public sealed class DriverActivationOptions
{
    public const string SectionName = "DriverActivation";

    public string WebAppBaseUrl { get; set; } = "http://localhost:5173";
    public int TokenLifetimeHours { get; set; } = 48;
}
