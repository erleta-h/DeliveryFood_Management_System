namespace FoodDelivery.Infrastructure.Restaurants;

internal static class MenuItemImageUrls
{
    /// <summary>Për katalog publik dhe &lt;img&gt; (pa JWT).</summary>
    public static string? PublicUrl(long? imageFileId) =>
        imageFileId is { } id ? $"/api/files/public/{id}" : null;

    /// <summary>Për panelin e kuzhinës — GET anonim sipas artikullit (shiko KitchenMenuController).</summary>
    public static string? KitchenItemImageUrl(long menuItemId, long? imageFileId) =>
        imageFileId is not null ? $"/api/kitchen/menu/items/{menuItemId}/image" : null;
}
