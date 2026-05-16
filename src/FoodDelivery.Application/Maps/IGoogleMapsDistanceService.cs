namespace FoodDelivery.Application.Maps;

public sealed record DrivingMatrixResult(
    bool Success,
    int? DistanceMeters,
    int? DurationSeconds,
    string? ErrorMessage);

public interface IGoogleMapsDistanceService
{
    /// <summary>Distance Matrix API (driving). Kthen gabim nëse <c>ServerApiKey</c> mungon ose përgjigjja nuk është OK.</summary>
    Task<DrivingMatrixResult> GetDrivingAsync(
        double originLat,
        double originLng,
        double destLat,
        double destLng,
        CancellationToken cancellationToken = default);
}
