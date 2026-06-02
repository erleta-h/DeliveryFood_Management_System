namespace FoodDelivery.Application.Restaurants;

public interface IKitchenMenuService
{
    Task<IReadOnlyList<RestaurantMenuCategoryDto>> GetMenuForStaffAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    /// <summary>null Id = gabim; përndryshe Id i kategorisë së re.</summary>
    Task<(long? Id, string? Error)> CreateCategoryAsync(
        long staffUserId,
        KitchenMenuCreateCategoryRequest request,
        CancellationToken cancellationToken = default);

    Task<string?> UpdateCategoryAsync(
        long staffUserId,
        long categoryId,
        KitchenMenuUpdateCategoryRequest request,
        CancellationToken cancellationToken = default);

    Task<string?> DeleteCategoryAsync(
        long staffUserId,
        long categoryId,
        CancellationToken cancellationToken = default);

    Task<(long? Id, string? Error)> CreateItemAsync(
        long staffUserId,
        KitchenMenuCreateItemRequest request,
        CancellationToken cancellationToken = default);

    Task<string?> UpdateItemAsync(
        long staffUserId,
        long itemId,
        KitchenMenuUpdateItemRequest request,
        CancellationToken cancellationToken = default);

    Task<string?> DeleteItemAsync(
        long staffUserId,
        long itemId,
        CancellationToken cancellationToken = default);

    /// <summary>Ngarko / zëvendëso foton e artikullit (JPEG, PNG, WebP, GIF).</summary>
    Task<string?> SetItemImageAsync(
        long staffUserId,
        long itemId,
        Stream fileStream,
        string originalFileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default);

    /// <summary>Hiq foton e artikullit.</summary>
    Task<string?> ClearItemImageAsync(long staffUserId, long itemId, CancellationToken cancellationToken = default);

    /// <summary>Rrugë fizike e fotos për GET publik (panel kuzhinë / img tag).</summary>
    Task<(string? PhysicalPath, string? ContentType, string? Error)> GetItemImageFileAsync(
        long itemId,
        CancellationToken cancellationToken = default);
}

