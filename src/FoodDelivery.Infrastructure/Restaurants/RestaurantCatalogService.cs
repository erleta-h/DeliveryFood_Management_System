using FoodDelivery.Application.Restaurants;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Restaurants;

public sealed class RestaurantCatalogService : IRestaurantCatalogService
{
    private const int MaxPreviewItemsPerRestaurant = 12;

    private readonly FoodDeliveryDbContext _db;

    public RestaurantCatalogService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<FoodCategoryOptionDto>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return await _db.FoodCategories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new FoodCategoryOptionDto(c.Id, c.Name, c.SortOrder))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RestaurantListItemDto>> SearchAsync(
        string? search,
        long? categoryId,
        RestaurantListSort sort,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Restaurants
            .AsNoTracking()
            .Where(r => r.IsActive && r.IsApproved);

        if (categoryId is { } cid)
            query = query.Where(r => r.FoodCategoryId == cid);

        if (!string.IsNullOrWhiteSpace(search))
        {
            foreach (var word in search.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var w = word;
                query = query.Where(r =>
                    r.Name.Contains(w)
                    || (r.City != null && r.City.Contains(w))
                    || (r.AddressLine != null && r.AddressLine.Contains(w))
                    || r.FoodCategory.Name.Contains(w));
            }
        }

        IOrderedQueryable<Restaurant> ordered = sort switch
        {
            RestaurantListSort.Rating => query
                .OrderByDescending(r => r.AverageRating)
                .ThenByDescending(r => r.ReviewCount),
            RestaurantListSort.EstimatedDelivery => query
                .OrderBy(r => r.EstimatedDeliveryMinutes),
            RestaurantListSort.DeliveryFee => query
                .OrderBy(r => r.DeliveryFee),
            RestaurantListSort.Name => query.OrderBy(r => r.Name),
            _ => query.OrderBy(r => r.Name),
        };

        var rows = await ordered
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
                r.AverageRating,
                r.ReviewCount,
                r.EstimatedDeliveryMinutes,
            })
            .ToListAsync(cancellationToken);

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

        var raw = await _db.MenuItems
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

    public async Task<RestaurantSummaryDto?> GetSummaryAsync(
        long restaurantId,
        CancellationToken cancellationToken = default)
    {
        return await _db.Restaurants
            .AsNoTracking()
            .Where(r => r.Id == restaurantId && r.IsActive && r.IsApproved)
            .Select(r => new RestaurantSummaryDto(r.Id, r.Name, r.DeliveryFee))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RestaurantMenuCategoryDto>> GetRestaurantMenuAsync(
        long restaurantId,
        CancellationToken cancellationToken = default)
    {
        var exists = await _db.Restaurants.AsNoTracking()
            .AnyAsync(r => r.Id == restaurantId && r.IsActive && r.IsApproved, cancellationToken);
        if (!exists)
            return Array.Empty<RestaurantMenuCategoryDto>();

        return await _db.MenuCategories
            .AsNoTracking()
            .Where(c => c.RestaurantId == restaurantId)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new RestaurantMenuCategoryDto(
                c.Id,
                c.Name,
                c.SortOrder,
                c.Items
                    .OrderBy(i => i.Name)
                    .Select(i => new RestaurantMenuItemDto(
                        i.Id,
                        i.Name,
                        i.Description,
                        i.Price,
                        i.IsAvailable,
                        MenuItemImageUrls.PublicUrl(i.ImageFileId)))
                    .ToList()))
            .ToListAsync(cancellationToken);
    }
}
