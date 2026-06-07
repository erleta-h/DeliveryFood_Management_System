using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Restaurants;
using FoodDelivery.Application.SiteContent;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Restaurants;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.SiteContent;

public sealed class PublicLandingService : IPublicLandingService
{
    private const int FeaturedLimit = 4;
    private const int MaxPreviewItemsPerRestaurant = 4;

    private static readonly int[] InProcessStatuses =
    [
        OrderStatus.Pending,
        OrderStatus.Confirmed,
        OrderStatus.Preparing,
        OrderStatus.ReadyForPickup,
        OrderStatus.OutForDelivery,
    ];

    private readonly IUnitOfWork _uow;

    public PublicLandingService(IUnitOfWork uow) => _uow = uow;

    public async Task<PublicLandingDataDto> GetLandingDataAsync(CancellationToken cancellationToken = default)
    {
        var stats = await LoadStatsAsync(cancellationToken);
        var featured = await LoadFeaturedRestaurantsAsync(cancellationToken);
        return new PublicLandingDataDto(stats, featured);
    }

    private async Task<PublicLandingStatsDto> LoadStatsAsync(CancellationToken cancellationToken)
    {
        var restaurants = _uow.Repository<Restaurant, long>().Query.AsNoTracking();
        var orders = _uow.Repository<Order, long>().Query.AsNoTracking();
        var drivers = _uow.Repository<DriverProfile, long>().Query.AsNoTracking();
        var users = _uow.Repository<User, long>().Query.AsNoTracking();

        var openRestaurants = await restaurants.CountAsync(r => r.IsActive && r.IsApproved, cancellationToken);

        var activeDrivers = await (
            from d in drivers
            join u in users on d.UserId equals u.Id
            where u.IsActive
            select d).CountAsync(cancellationToken);

        var ordersInProcess = await orders.CountAsync(
            o => InProcessStatuses.Contains(o.Status),
            cancellationToken);

        var completedOrders = await orders.CountAsync(o => o.Status == OrderStatus.Delivered, cancellationToken);

        var satisfiedCustomers = await orders
            .Where(o => o.Status == OrderStatus.Delivered)
            .Select(o => o.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var avgFromRestaurants = await restaurants
            .Where(r => r.IsActive && r.IsApproved && r.EstimatedDeliveryMinutes > 0)
            .Select(r => (double?)r.EstimatedDeliveryMinutes)
            .AverageAsync(cancellationToken);

        var averageDeliveryMinutes = avgFromRestaurants is > 0
            ? (int)Math.Round(avgFromRestaurants.Value)
            : 0;

        return new PublicLandingStatsDto(
            openRestaurants,
            activeDrivers,
            ordersInProcess,
            averageDeliveryMinutes,
            openRestaurants,
            completedOrders,
            satisfiedCustomers);
    }

    private async Task<IReadOnlyList<RestaurantListItemDto>> LoadFeaturedRestaurantsAsync(
        CancellationToken cancellationToken)
    {
        var baseQuery = _uow.Repository<Restaurant, long>().Query
            .AsNoTracking()
            .Where(r => r.IsActive && r.IsApproved);

        var featuredIds = await baseQuery
            .Where(r => r.IsFeatured)
            .OrderByDescending(r => r.AverageRating)
            .ThenByDescending(r => r.ReviewCount)
            .Select(r => r.Id)
            .Take(FeaturedLimit)
            .ToListAsync(cancellationToken);

        if (featuredIds.Count < FeaturedLimit)
        {
            var filler = await baseQuery
                .Where(r => !featuredIds.Contains(r.Id))
                .OrderByDescending(r => r.AverageRating)
                .ThenByDescending(r => r.ReviewCount)
                .Select(r => r.Id)
                .Take(FeaturedLimit - featuredIds.Count)
                .ToListAsync(cancellationToken);
            featuredIds.AddRange(filler);
        }

        if (featuredIds.Count == 0)
            return Array.Empty<RestaurantListItemDto>();

        var rows = await baseQuery
            .Where(r => featuredIds.Contains(r.Id))
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Slug,
                r.City,
                r.AddressLine,
                CategoryName = r.FoodCategory.Name,
                r.FoodCategoryId,
                r.DeliveryFee,
                r.MinOrderAmount,
                r.AverageRating,
                r.ReviewCount,
                r.EstimatedDeliveryMinutes,
                r.Latitude,
                r.Longitude,
                r.IsFeatured,
            })
            .ToListAsync(cancellationToken);

        var orderMap = featuredIds
            .Select((id, idx) => (id, idx))
            .ToDictionary(x => x.id, x => x.idx);

        rows = rows.OrderBy(r => orderMap.GetValueOrDefault(r.Id, int.MaxValue)).ToList();

        var ids = rows.Select(x => x.Id).ToList();
        var previews = await LoadPreviewItemsAsync(ids, cancellationToken);

        return rows
            .Select(r => new RestaurantListItemDto(
                r.Id,
                r.Name,
                r.Slug,
                r.City,
                r.AddressLine,
                r.CategoryName,
                r.FoodCategoryId,
                r.DeliveryFee,
                r.MinOrderAmount,
                r.AverageRating,
                r.ReviewCount,
                r.EstimatedDeliveryMinutes,
                previews.GetValueOrDefault(r.Id, Array.Empty<RestaurantProductPreviewDto>())))
            .ToList();
    }

    private async Task<Dictionary<long, IReadOnlyList<RestaurantProductPreviewDto>>> LoadPreviewItemsAsync(
        IReadOnlyList<long> restaurantIds,
        CancellationToken cancellationToken)
    {
        if (restaurantIds.Count == 0)
            return new Dictionary<long, IReadOnlyList<RestaurantProductPreviewDto>>();

        var raw = await _uow.Repository<MenuItem, long>().Query
            .AsNoTracking()
            .Where(i => i.IsAvailable && restaurantIds.Contains(i.MenuCategory.RestaurantId))
            .OrderBy(i => i.MenuCategory.RestaurantId)
            .ThenBy(i => i.MenuCategory.SortOrder)
            .ThenBy(i => i.MenuCategory.Name)
            .ThenBy(i => i.Name)
            .Select(i => new
            {
                RestaurantId = i.MenuCategory.RestaurantId,
                i.Id,
                i.Name,
                i.Price,
                i.ImageFileId,
            })
            .ToListAsync(cancellationToken);

        return raw
            .GroupBy(x => x.RestaurantId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<RestaurantProductPreviewDto>)g
                    .Take(MaxPreviewItemsPerRestaurant)
                    .Select(x => new RestaurantProductPreviewDto(
                        x.Id,
                        x.Name,
                        x.Price,
                        MenuItemImageUrls.PublicUrl(x.ImageFileId)))
                    .ToList());
    }
}
