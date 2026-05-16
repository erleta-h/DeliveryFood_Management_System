namespace FoodDelivery.Application.Maps;

public interface ICustomerDrivingPreviewService
{
    Task<DrivingPreviewResponse> GetDrivingToRestaurantAsync(
        long userId,
        long restaurantId,
        CancellationToken cancellationToken = default);
}
