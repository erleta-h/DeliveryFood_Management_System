namespace FoodDelivery.Application.Restaurants;

public sealed record KitchenBrandingDto(
    long RestaurantId,
    string RestaurantName,
    string CategoryName,
    string? LogoUrl,
    string? CoverUrl,
    bool HasCustomLogo,
    bool HasCustomCover);

public interface IKitchenBrandingService
{
    Task<KitchenBrandingDto?> GetBrandingAsync(long staffUserId, CancellationToken cancellationToken = default);

    Task<string?> SetLogoAsync(
        long staffUserId,
        Stream fileStream,
        string originalFileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default);

    Task<string?> SetCoverAsync(
        long staffUserId,
        Stream fileStream,
        string originalFileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default);

    Task<string?> ClearLogoAsync(long staffUserId, CancellationToken cancellationToken = default);

    Task<string?> ClearCoverAsync(long staffUserId, CancellationToken cancellationToken = default);
}
