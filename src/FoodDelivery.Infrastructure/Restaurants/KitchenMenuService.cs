using FoodDelivery.Application.Restaurants;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Restaurants;

public sealed class KitchenMenuService : IKitchenMenuService
{
    private const int MaxNameLength = 160;
    private const int MaxDescriptionLength = 2000;

    private readonly FoodDeliveryDbContext _db;

    public KitchenMenuService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    private async Task<long?> GetStaffRestaurantIdAsync(long staffUserId, CancellationToken cancellationToken)
    {
        return await _db.RestaurantStaff.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RestaurantMenuCategoryDto>> GetMenuForStaffAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return Array.Empty<RestaurantMenuCategoryDto>();

        return await _db.MenuCategories
            .AsNoTracking()
            .Where(c => c.RestaurantId == restaurantId.Value)
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

    public async Task<(long? Id, string? Error)> CreateCategoryAsync(
        long staffUserId,
        KitchenMenuCreateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return (null, "Nuk je i lidhur me asnjë restorant.");

        var name = request.Name.Trim();
        var nameErr = ValidateCategoryName(name);
        if (nameErr is not null)
            return (null, nameErr);

        int sortOrder;
        if (request.SortOrder is { } so)
            sortOrder = so;
        else
        {
            var max = await _db.MenuCategories
                .Where(c => c.RestaurantId == restaurantId.Value)
                .Select(c => (int?)c.SortOrder)
                .MaxAsync(cancellationToken) ?? -1;
            sortOrder = max + 1;
        }

        var now = DateTime.UtcNow;
        var row = new MenuCategory
        {
            Name = name,
            RestaurantId = restaurantId.Value,
            SortOrder = sortOrder,
            CreatedAt = now,
            CreatedById = staffUserId,
        };
        _db.MenuCategories.Add(row);
        await _db.SaveChangesAsync(cancellationToken);
        return (row.Id, null);
    }

    public async Task<string?> UpdateCategoryAsync(
        long staffUserId,
        long categoryId,
        KitchenMenuUpdateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var cat = await _db.MenuCategories
            .FirstOrDefaultAsync(
                c => c.Id == categoryId && c.RestaurantId == restaurantId.Value,
                cancellationToken);
        if (cat is null)
            return "Kategoria nuk u gjet.";

        if (request.Name is null && request.SortOrder is null)
            return "Dërgo të paktën një fushë: emër ose renditje.";

        if (request.Name is not null)
        {
            var name = request.Name.Trim();
            var nameErr = ValidateCategoryName(name);
            if (nameErr is not null)
                return nameErr;
            cat.Name = name;
        }

        if (request.SortOrder is { } so)
            cat.SortOrder = so;

        var now = DateTime.UtcNow;
        cat.UpdatedAt = now;
        cat.UpdatedById = staffUserId;
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> DeleteCategoryAsync(
        long staffUserId,
        long categoryId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var cat = await _db.MenuCategories
            .Include(c => c.Items)
            .FirstOrDefaultAsync(
                c => c.Id == categoryId && c.RestaurantId == restaurantId.Value,
                cancellationToken);
        if (cat is null)
            return "Kategoria nuk u gjet.";
        if (cat.Items.Count > 0)
            return "Kategoria ka artikuj — fshiji artikujt së pari ose zhvendosi ata.";

        _db.MenuCategories.Remove(cat);
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<(long? Id, string? Error)> CreateItemAsync(
        long staffUserId,
        KitchenMenuCreateItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return (null, "Nuk je i lidhur me asnjë restorant.");

        var catOk = await _db.MenuCategories.AsNoTracking()
            .AnyAsync(
                c => c.Id == request.MenuCategoryId && c.RestaurantId == restaurantId.Value,
                cancellationToken);
        if (!catOk)
            return (null, "Kategoria nuk i përket restorantit tënd.");

        var name = request.Name.Trim();
        var nameErr = ValidateItemName(name);
        if (nameErr is not null)
            return (null, nameErr);

        var priceErr = ValidatePrice(request.Price);
        if (priceErr is not null)
            return (null, priceErr);

        var desc = NormalizeDescription(request.Description);

        var now = DateTime.UtcNow;
        var row = new MenuItem
        {
            MenuCategoryId = request.MenuCategoryId,
            Name = name,
            Description = desc,
            Price = decimal.Round(request.Price, 2, MidpointRounding.AwayFromZero),
            IsAvailable = request.IsAvailable,
            CreatedAt = now,
            CreatedById = staffUserId,
        };
        _db.MenuItems.Add(row);
        await _db.SaveChangesAsync(cancellationToken);
        return (row.Id, null);
    }

    public async Task<string?> UpdateItemAsync(
        long staffUserId,
        long itemId,
        KitchenMenuUpdateItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var item = await _db.MenuItems
            .Include(i => i.MenuCategory)
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken);
        if (item is null)
            return "Artikulli nuk u gjet.";
        if (item.MenuCategory.RestaurantId != restaurantId.Value)
            return "Artikulli nuk i përket restorantit tënd.";

        if (request.Name is null && request.Description is null && request.Price is null && request.IsAvailable is null)
            return "Dërgo të paktën një fushë për përditësim.";

        if (request.Name is not null)
        {
            var name = request.Name.Trim();
            var nameErr = ValidateItemName(name);
            if (nameErr is not null)
                return nameErr;
            item.Name = name;
        }

        if (request.Description is not null)
            item.Description = NormalizeDescription(request.Description);

        if (request.Price is { } p)
        {
            var priceErr = ValidatePrice(p);
            if (priceErr is not null)
                return priceErr;
            item.Price = decimal.Round(p, 2, MidpointRounding.AwayFromZero);
        }

        if (request.IsAvailable is { } av)
            item.IsAvailable = av;

        var now = DateTime.UtcNow;
        item.UpdatedAt = now;
        item.UpdatedById = staffUserId;
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> DeleteItemAsync(
        long staffUserId,
        long itemId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var item = await _db.MenuItems
            .Include(i => i.MenuCategory)
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken);
        if (item is null)
            return "Artikulli nuk u gjet.";
        if (item.MenuCategory.RestaurantId != restaurantId.Value)
            return "Artikulli nuk i përket restorantit tënd.";

        var hasOrders = await _db.OrderItems.AsNoTracking()
            .AnyAsync(o => o.MenuItemId == itemId, cancellationToken);
        if (hasOrders)
            return "Artikulli ka histori porosish — mos e fshij. Çaktivizoje (jo i disponueshëm) në vend.";

        _db.MenuItems.Remove(item);
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static string? ValidateCategoryName(string name)
    {
        if (name.Length < 1)
            return "Emri i kategorisë është i detyrueshëm.";
        if (name.Length > MaxNameLength)
            return $"Emri i kategorisë maksimum {MaxNameLength} karaktere.";
        return null;
    }

    private static string? ValidateItemName(string name)
    {
        if (name.Length < 1)
            return "Emri i artikullit është i detyrueshëm.";
        if (name.Length > MaxNameLength)
            return $"Emri i artikullit maksimum {MaxNameLength} karaktere.";
        return null;
    }

    private static string? ValidatePrice(decimal price)
    {
        if (price < 0)
            return "Çmimi nuk mund të jetë negativ.";
        if (price > 999_999.99m)
            return "Çmimi është shumë i madh.";
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
