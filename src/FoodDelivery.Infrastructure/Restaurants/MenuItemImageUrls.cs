namespace FoodDelivery.Infrastructure.Restaurants;

internal static class MenuItemImageUrls
{
    public static string? PublicUrl(long? imageFileId) =>
        imageFileId is { } id ? $"/api/files/public/{id}" : null;
}
