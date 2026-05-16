namespace FoodDelivery.Application.Maps;

/// <summary>Përgjigje për klientin: distanca me makinë deri te restoranti (nëse ka koordinata + API key).</summary>
public sealed record DrivingPreviewResponse(
    bool ServerKeyConfigured,
    bool CoordinatesAvailable,
    int? DistanceMeters,
    int? DurationSeconds,
    string? Message);
