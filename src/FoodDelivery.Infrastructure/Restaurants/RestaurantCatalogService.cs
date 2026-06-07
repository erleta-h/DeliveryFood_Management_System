using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Delivery;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Restaurants;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Caching;
using FoodDelivery.Infrastructure.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace FoodDelivery.Infrastructure.Restaurants;

public sealed class RestaurantCatalogService : IRestaurantCatalogService
{
    private const int MaxPreviewItemsPerRestaurant = 12;

    private static readonly TimeSpan CategoriesTtl = TimeSpan.FromMinutes(2);

    private static readonly TimeSpan MenuTtl = TimeSpan.FromSeconds(45);

    private static readonly TimeSpan SummaryTtl = TimeSpan.FromSeconds(60);

    private readonly IUnitOfWork _uow;
    private readonly IDistributedCache _cache;

    public RestaurantCatalogService(IUnitOfWork uow, IDistributedCache cache)
    {
        _uow = uow;
        _cache = cache;
    }

    public async Task<IReadOnlyList<FoodCategoryOptionDto>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        var cached = await DistributedJsonCache
            .GetAsync<List<FoodCategoryOptionDto>>(_cache, RestaurantCatalogCacheKeys.FoodCategories, cancellationToken)
            .ConfigureAwait(false);
        if (cached is not null)
            return cached;

        var list = await _uow.Repository<FoodCategory, long>().Query
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new FoodCategoryOptionDto(c.Id, c.Name, c.SortOrder))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        await DistributedJsonCache
            .SetAsync(_cache, RestaurantCatalogCacheKeys.FoodCategories, list, CategoriesTtl, cancellationToken)
            .ConfigureAwait(false);
        return list;
    }

    public async Task<IReadOnlyList<RestaurantListItemDto>> SearchAsync(
        string? search,
        long? categoryId,
        RestaurantListSort sort,
        double? customerLat,
        double? customerLng,
        CancellationToken cancellationToken = default)
    {
        var query = _uow.Repository<Restaurant, long>().Query
            .AsNoTracking()
            .Include(r => r.FoodCategory)
            .Include(r => r.DeliveryZone)
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

        double clat = 0, clng = 0;
        var useProximity = sort == RestaurantListSort.Proximity
            && TryCustomerGeo(customerLat, customerLng, out clat, out clng);
        var effectiveSort = sort == RestaurantListSort.Proximity && !useProximity
            ? RestaurantListSort.Rating
            : sort;

        IOrderedQueryable<Restaurant> ordered = effectiveSort switch
        {
            RestaurantListSort.Rating => query
                .OrderByDescending(r => r.AverageRating)
                .ThenByDescending(r => r.ReviewCount),
            RestaurantListSort.EstimatedDelivery => query.OrderBy(r => r.EstimatedDeliveryMinutes),
            RestaurantListSort.DeliveryFee => query.OrderBy(r => r.DeliveryFee),
            RestaurantListSort.Name => query.OrderBy(r => r.Name),
            RestaurantListSort.Proximity => query.OrderBy(r => r.Id),
            _ => query.OrderBy(r => r.Name),
        };

        var materialized = await ordered.ToListAsync(cancellationToken).ConfigureAwait(false);

        if (effectiveSort == RestaurantListSort.DeliveryFee)
        {
            materialized = materialized
                .OrderBy(r => RestaurantDeliveryTerms.EffectiveDeliveryFee(r, r.DeliveryZone))
                .ToList();
        }
        else if (effectiveSort == RestaurantListSort.EstimatedDelivery)
        {
            materialized = materialized
                .OrderBy(r => RestaurantDeliveryTerms.EffectiveEstimatedMinutes(r, r.DeliveryZone))
                .ToList();
        }

        var rows = materialized
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Slug,
                r.City,
                r.AddressLine,
                CategoryName = r.FoodCategory.Name,
                r.FoodCategoryId,
                DeliveryFee = RestaurantDeliveryTerms.EffectiveDeliveryFee(r, r.DeliveryZone),
                MinOrderAmount = RestaurantDeliveryTerms.EffectiveMinOrderAmount(r, r.DeliveryZone),
                r.AverageRating,
                r.ReviewCount,
                EstimatedDeliveryMinutes = RestaurantDeliveryTerms.EffectiveEstimatedMinutes(r, r.DeliveryZone),
                r.Latitude,
                r.Longitude,
            })
            .ToList();

        if (useProximity)
        {
            rows = rows
                .OrderBy(r => DriverGeo.DistanceKm(clat, clng, r.Latitude, r.Longitude) ?? double.MaxValue)
                .ToList();
        }

        var ids = rows.Select(x => x.Id).ToList();
        var previews = await LoadPreviewItemsAsync(ids, cancellationToken);

        return rows
            .Select(r =>
            {
                double? dist = null;
                if (useProximity)
                    dist = DriverGeo.DistanceKm(clat, clng, r.Latitude, r.Longitude);

                return new RestaurantListItemDto(
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
                    previews.GetValueOrDefault(r.Id, Array.Empty<RestaurantProductPreviewDto>()),
                    dist);
            })
            .ToList();
    }

    private static bool TryCustomerGeo(double? lat, double? lng, out double clat, out double clng)
    {
        clat = 0;
        clng = 0;
        if (lat is not { } la || lng is not { } lo)
            return false;
        if (la is < -90 or > 90 || lo is < -180 or > 180)
            return false;
        clat = la;
        clng = lo;
        return true;
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

    public async Task<RestaurantSummaryDto?> GetSummaryAsync(
        long restaurantId,
        CancellationToken cancellationToken = default)
    {
        var key = RestaurantCatalogCacheKeys.RestaurantSummary(restaurantId);
        var cached = await DistributedJsonCache
            .GetAsync<RestaurantSummaryDto>(_cache, key, cancellationToken)
            .ConfigureAwait(false);
        if (cached is not null)
            return cached;

        var entity = await _uow.Repository<Restaurant, long>().Query
            .AsNoTracking()
            .Include(r => r.FoodCategory)
            .Include(r => r.DeliveryZone)
            .Where(r => r.Id == restaurantId && r.IsActive && r.IsApproved)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        if (entity is null)
            return null;

        var row = new RestaurantSummaryDto(
            entity.Id,
            entity.Name,
            entity.FoodCategory.Name,
            RestaurantDeliveryTerms.EffectiveDeliveryFee(entity, entity.DeliveryZone),
            RestaurantDeliveryTerms.EffectiveEstimatedMinutes(entity, entity.DeliveryZone),
            entity.AverageRating,
            entity.ReviewCount,
            entity.AddressLine,
            entity.City,
            entity.Latitude,
            entity.Longitude,
            RestaurantDeliveryTerms.EffectiveMinOrderAmount(entity, entity.DeliveryZone));

        await DistributedJsonCache
            .SetAsync(_cache, key, row, SummaryTtl, cancellationToken)
            .ConfigureAwait(false);
        return row;
    }

    public async Task<IReadOnlyList<RestaurantMenuCategoryDto>> GetRestaurantMenuAsync(
        long restaurantId,
        CancellationToken cancellationToken = default)
    {
        var key = RestaurantCatalogCacheKeys.RestaurantMenu(restaurantId);
        var cached = await DistributedJsonCache
            .GetAsync<List<RestaurantMenuCategoryDto>>(_cache, key, cancellationToken)
            .ConfigureAwait(false);
        if (cached is not null)
            return cached;

        var exists = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
            .AnyAsync(r => r.Id == restaurantId && r.IsActive && r.IsApproved, cancellationToken)
            .ConfigureAwait(false);
        if (!exists)
        {
            var empty = new List<RestaurantMenuCategoryDto>();
            await DistributedJsonCache
                .SetAsync(_cache, key, empty, TimeSpan.FromSeconds(30), cancellationToken)
                .ConfigureAwait(false);
            return Array.Empty<RestaurantMenuCategoryDto>();
        }

        var menu = await _uow.Repository<MenuCategory, long>().Query
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
                        i.IsFeatured,
                        MenuItemImageUrls.PublicUrl(i.ImageFileId)))
                    .ToList()))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        await DistributedJsonCache
            .SetAsync(_cache, key, menu, MenuTtl, cancellationToken)
            .ConfigureAwait(false);
        return menu;
    }

    public async Task<RestaurantReviewsResultDto?> GetRestaurantReviewsAsync(
        long restaurantId,
        int take,
        CancellationToken cancellationToken = default)
    {
        const int restaurantSubject = 0;
        var limit = Math.Clamp(take, 1, 100);

        var exists = await _uow.Repository<Restaurant, long>().Query
            .AsNoTracking()
            .AnyAsync(r => r.Id == restaurantId && r.IsActive && r.IsApproved, cancellationToken)
            .ConfigureAwait(false);
        if (!exists)
            return null;

        var rows = await _uow.Repository<Review, long>().Query
            .AsNoTracking()
            .Where(r =>
                r.RestaurantId == restaurantId &&
                r.Subject == restaurantSubject &&
                r.Status == ReviewModerationStatus.Public)
            .OrderByDescending(r => r.CreatedAt)
            .Take(limit)
            .Select(r => new
            {
                r.Id,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.Author.FirstName,
                r.Author.LastName,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var items = rows
            .Select(r => new RestaurantReviewDto(
                r.Id,
                r.Rating,
                string.IsNullOrWhiteSpace(r.Comment) ? null : r.Comment.Trim(),
                r.CreatedAt,
                FormatAuthorName(r.FirstName, r.LastName)))
            .ToList();

        var total = await _uow.Repository<Review, long>().Query
            .AsNoTracking()
            .CountAsync(r =>
                r.RestaurantId == restaurantId &&
                r.Subject == restaurantSubject &&
                r.Status == ReviewModerationStatus.Public,
                cancellationToken)
            .ConfigureAwait(false);

        var avg = total > 0
            ? await _uow.Repository<Review, long>().Query
                .AsNoTracking()
                .Where(r =>
                    r.RestaurantId == restaurantId &&
                    r.Subject == restaurantSubject &&
                    r.Status == ReviewModerationStatus.Public)
                .AverageAsync(r => (double)r.Rating, cancellationToken)
                .ConfigureAwait(false)
            : 0;

        return new RestaurantReviewsResultDto(
            total > 0 ? (decimal)Math.Round(avg, 1) : 0,
            total,
            items);
    }

    private static string FormatAuthorName(string firstName, string lastName)
    {
        var f = firstName.Trim();
        var l = lastName.Trim();
        if (string.IsNullOrEmpty(f) && string.IsNullOrEmpty(l))
            return "Klient";
        if (string.IsNullOrEmpty(l))
            return f;
        return $"{f} {l[0]}.";
    }
}
