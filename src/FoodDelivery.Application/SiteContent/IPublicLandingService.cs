using FoodDelivery.Application.Restaurants;

namespace FoodDelivery.Application.SiteContent;

public sealed record PublicLandingStatsDto(
    int OpenRestaurantsCount,
    int ActiveDriversCount,
    int OrdersInProcessCount,
    int AverageDeliveryMinutes,
    int PartnerRestaurantsCount,
    int CompletedOrdersCount,
    int SatisfiedCustomersCount);

public sealed record PublicLandingDataDto(
    PublicLandingStatsDto Stats,
    IReadOnlyList<RestaurantListItemDto> FeaturedRestaurants);

public interface IPublicLandingService
{
    Task<PublicLandingDataDto> GetLandingDataAsync(CancellationToken cancellationToken = default);
}
