namespace FoodDelivery.Infrastructure.Maps;

internal static class GeoCoordinateValidation
{
    public static bool IsSafe(double latitude, double longitude) =>
        !double.IsNaN(latitude)
        && !double.IsNaN(longitude)
        && !double.IsInfinity(latitude)
        && !double.IsInfinity(longitude)
        && latitude is >= -90 and <= 90
        && longitude is >= -180 and <= 180;
}
