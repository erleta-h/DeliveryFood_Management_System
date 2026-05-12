using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Caching;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminFoodCategoriesService : IAdminFoodCategoriesService
{
    private const int MaxNameLength = 120;
    private const int MaxDescriptionLength = 500;

    private readonly IUnitOfWork _uow;
    private readonly IDistributedCache _cache;

    public AdminFoodCategoriesService(IUnitOfWork uow, IDistributedCache cache)
    {
        _uow = uow;
        _cache = cache;
    }

    public async Task<IReadOnlyList<AdminFoodCategoryRowDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<FoodCategory, long>().Query.AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new AdminFoodCategoryRowDto(
                c.Id,
                c.Name,
                c.SortOrder,
                c.Description,
                c.Restaurants.Count,
                c.CreatedAt,
                c.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<(bool ok, long? id, string? error)> CreateAsync(
        long adminUserId,
        AdminFoodCategoryCreateRequest request,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        var nameErr = ValidateName(name);
        if (nameErr is not null)
            return (false, null, nameErr);

        if (await _uow.Repository<FoodCategory, long>().Query.AnyAsync(c => c.Name == name, cancellationToken))
            return (false, null, "Ekziston tashmë një kategori me këtë emër.");

        var now = DateTime.UtcNow;
        int sortOrder;
        if (request.SortOrder is { } so)
            sortOrder = so;
        else
        {
            var max = await _uow.Repository<FoodCategory, long>().Query
                .Select(c => (int?)c.SortOrder)
                .MaxAsync(cancellationToken) ?? -1;
            sortOrder = max + 1;
        }

        var desc = NormalizeDescription(request.Description);
        var row = new FoodCategory
        {
            Name = name,
            SortOrder = sortOrder,
            Description = desc,
            CreatedAt = now,
            CreatedById = adminUserId,
        };
        _uow.Repository<FoodCategory, long>().Add(row);
        await _uow.SaveChangesAsync(cancellationToken);

        await RestaurantCatalogCacheInvalidation.InvalidateFoodCategoriesAsync(_cache, cancellationToken)
            .ConfigureAwait(false);

        return (true, row.Id, null);
    }

    public async Task<string?> UpdateAsync(
        long adminUserId,
        long categoryId,
        AdminFoodCategoryUpdateRequest request,
        CancellationToken cancellationToken = default)
    {
        var cat = await _uow.Repository<FoodCategory, long>().Query
            .FirstOrDefaultAsync(c => c.Id == categoryId, cancellationToken);
        if (cat is null)
            return "Kategoria nuk u gjet.";

        if (request.Name is null && request.SortOrder is null && request.Description is null)
            return "Dërgo të paktën një fushë për përditësim.";

        if (request.Name is not null)
        {
            var name = request.Name.Trim();
            var nameErr = ValidateName(name);
            if (nameErr is not null)
                return nameErr;
            var taken = await _uow.Repository<FoodCategory, long>().Query
                .AnyAsync(c => c.Id != categoryId && c.Name == name, cancellationToken);
            if (taken)
                return "Ekziston tashmë një kategori me këtë emër.";
            cat.Name = name;
        }

        if (request.SortOrder is { } so)
            cat.SortOrder = so;

        if (request.Description is not null)
            cat.Description = NormalizeDescription(request.Description);

        var now = DateTime.UtcNow;
        cat.UpdatedAt = now;
        cat.UpdatedById = adminUserId;
        await _uow.SaveChangesAsync(cancellationToken);

        await RestaurantCatalogCacheInvalidation.InvalidateFoodCategoriesAsync(_cache, cancellationToken)
            .ConfigureAwait(false);
        return null;
    }

    public async Task<string?> DeleteAsync(long categoryId, CancellationToken cancellationToken = default)
    {
        var cat = await _uow.Repository<FoodCategory, long>().Query
            .Include(c => c.Restaurants)
            .FirstOrDefaultAsync(c => c.Id == categoryId, cancellationToken);
        if (cat is null)
            return "Kategoria nuk u gjet.";
        if (cat.Restaurants.Count > 0)
            return $"Kategoria ka {cat.Restaurants.Count} restorant(e) të lidhur — zhvendosi restorantet te një kategori tjetër para fshirjes.";

        _uow.Repository<FoodCategory, long>().Remove(cat);
        await _uow.SaveChangesAsync(cancellationToken);

        await RestaurantCatalogCacheInvalidation.InvalidateFoodCategoriesAsync(_cache, cancellationToken)
            .ConfigureAwait(false);
        return null;
    }

    private static string? ValidateName(string name)
    {
        if (name.Length is < 1 or > MaxNameLength)
            return $"Emri i kategorisë: 1–{MaxNameLength} karaktere.";
        return null;
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return null;
        var t = description.Trim();
        return t.Length > MaxDescriptionLength ? t[..MaxDescriptionLength] : t;
    }
}
