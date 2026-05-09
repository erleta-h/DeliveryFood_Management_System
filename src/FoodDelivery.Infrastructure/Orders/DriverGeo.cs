namespace FoodDelivery.Infrastructure.Orders;

internal static class DriverGeo
{
    public static double? DistanceKm(double? lat1, double? lon1, double? lat2, double? lon2)
    {
        if (lat1 is null || lon1 is null || lat2 is null || lon2 is null)
            return null;

        const double R = 6371.0;
        var dLat = ToRad(lat2.Value - lat1.Value);
        var dLon = ToRad(lon2.Value - lon1.Value);
        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(ToRad(lat1.Value)) * Math.Cos(ToRad(lat2.Value)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return Math.Round(R * c, 2);
    }

    private static double ToRad(double deg) => deg * (Math.PI / 180.0);
}
