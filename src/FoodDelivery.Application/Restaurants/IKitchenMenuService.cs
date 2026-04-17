namespace FoodDelivery.Application.Restaurants;

public interface IKitchenMenuService
{
    Task<IReadOnlyList<RestaurantMenuCategoryDto>> GetMenuForStaffAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

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
}

