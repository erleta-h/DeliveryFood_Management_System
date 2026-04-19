namespace FoodDelivery.Application.Admin;

public interface IAdminRestaurantsService
{
    Task<AdminRestaurantListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default);

    Task<string?> PatchAsync(long restaurantId, AdminRestaurantPatchRequest request, CancellationToken cancellationToken = default);
}
