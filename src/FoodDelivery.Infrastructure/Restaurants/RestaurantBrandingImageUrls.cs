namespace FoodDelivery.Infrastructure.Restaurants;

internal static class RestaurantBrandingImageUrls
{
    public static string? PublicUrl(long? fileId) =>
        fileId is { } id ? $"/api/files/public/{id}" : null;
}
