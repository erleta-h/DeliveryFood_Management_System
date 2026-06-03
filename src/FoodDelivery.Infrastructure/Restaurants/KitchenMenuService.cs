using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Restaurants;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Caching;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Restaurants;

public sealed class KitchenMenuService : IKitchenMenuService
{
    private const int MaxNameLength = 160;
    private const int MaxDescriptionLength = 2000;

    private readonly IUnitOfWork _uow;
    private readonly IHostEnvironment _env;
    private readonly MenuImageStorageOptions _imgOpt;
    private readonly IDistributedCache _cache;

    public KitchenMenuService(
        IUnitOfWork uow,
        IHostEnvironment env,
        IOptions<MenuImageStorageOptions> imgOpt,
        IDistributedCache cache)
    {
        _uow = uow;
        _env = env;
        _imgOpt = imgOpt.Value;
        _cache = cache;
    }

    private async Task<long?> GetStaffRestaurantIdAsync(long staffUserId, CancellationToken cancellationToken)
    {
        return await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
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

        return await _uow.Repository<MenuCategory, long>().Query
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
                        i.IsFeatured,
                        MenuItemImageUrls.KitchenItemImageUrl(i.Id, i.ImageFileId)))
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
            var max = await _uow.Repository<MenuCategory, long>().Query
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
        _uow.Repository<MenuCategory, long>().Add(row);
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
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

        var cat = await _uow.Repository<MenuCategory, long>().Query
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
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
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

        var cat = await _uow.Repository<MenuCategory, long>().Query
            .Include(c => c.Items)
            .FirstOrDefaultAsync(
                c => c.Id == categoryId && c.RestaurantId == restaurantId.Value,
                cancellationToken);
        if (cat is null)
            return "Kategoria nuk u gjet.";
        if (cat.Items.Count > 0)
            return "Kategoria ka artikuj — fshiji artikujt së pari ose zhvendosi ata.";

        _uow.Repository<MenuCategory, long>().Remove(cat);
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
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

        var catOk = await _uow.Repository<MenuCategory, long>().Query.AsNoTracking()
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
            IsFeatured = request.IsFeatured,
            CreatedAt = now,
            CreatedById = staffUserId,
        };
        _uow.Repository<MenuItem, long>().Add(row);
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
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

        var item = await _uow.Repository<MenuItem, long>().Query
            .Include(i => i.MenuCategory)
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken);
        if (item is null)
            return "Artikulli nuk u gjet.";
        if (item.MenuCategory.RestaurantId != restaurantId.Value)
            return "Artikulli nuk i përket restorantit tënd.";

        if (request.Name is null && request.Description is null && request.Price is null
            && request.IsAvailable is null && request.IsFeatured is null)
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

        if (request.IsFeatured is { } feat)
            item.IsFeatured = feat;

        var now = DateTime.UtcNow;
        item.UpdatedAt = now;
        item.UpdatedById = staffUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
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

        var item = await _uow.Repository<MenuItem, long>().Query
            .Include(i => i.MenuCategory)
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken);
        if (item is null)
            return "Artikulli nuk u gjet.";
        if (item.MenuCategory.RestaurantId != restaurantId.Value)
            return "Artikulli nuk i përket restorantit tënd.";

        var hasOrders = await _uow.Repository<OrderItem, long>().Query.AsNoTracking()
            .AnyAsync(o => o.MenuItemId == itemId, cancellationToken);
        if (hasOrders)
            return "Artikulli ka histori porosish — mos e fshij. Çaktivizoje (jo i disponueshëm) në vend.";

        await RemoveItemImageCoreAsync(item, cancellationToken);
        _uow.Repository<MenuItem, long>().Remove(item);
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
        return null;
    }

    public async Task<string?> SetItemImageAsync(
        long staffUserId,
        long itemId,
        Stream fileStream,
        string originalFileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default)
    {
        if (contentLength <= 0 || contentLength > _imgOpt.MaxFileBytes)
            return $"Fotoja duhet të jetë midis 1 bajt dhe {_imgOpt.MaxFileBytes / 1024 / 1024} MB.";

        var ext = NormalizeImageExtension(contentType, originalFileName);
        if (ext is null)
            return "Formati i lejuar: JPEG, PNG, WebP ose GIF.";

        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var item = await _uow.Repository<MenuItem, long>().Query
            .Include(i => i.MenuCategory)
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken);
        if (item is null)
            return "Artikulli nuk u gjet.";
        if (item.MenuCategory.RestaurantId != restaurantId.Value)
            return "Artikulli nuk i përket restorantit tënd.";

        await RemoveItemImageCoreAsync(item, cancellationToken);

        var root = Path.GetFullPath(Path.Combine(_env.ContentRootPath, _imgOpt.RelativeRoot));
        Directory.CreateDirectory(root);
        var safeName = $"{itemId}_{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(root, safeName);

        long totalWritten = 0;
        await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            var buffer = new byte[81920];
            int read;
            while ((read = await fileStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
            {
                totalWritten += read;
                if (totalWritten > _imgOpt.MaxFileBytes)
                {
                    TryDeletePhysical(fullPath);
                    return $"Fotoja duhet të jetë maksimum {_imgOpt.MaxFileBytes / 1024 / 1024} MB.";
                }

                await fs.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            }
        }

        if (totalWritten == 0)
        {
            TryDeletePhysical(fullPath);
            return "Skedari i fotos është bosh.";
        }

        var displayName = string.IsNullOrWhiteSpace(originalFileName) ? safeName : originalFileName.Trim();
        if (displayName.Length > 500)
            displayName = displayName[..500];

        var now = DateTime.UtcNow;
        var stored = new StoredFile
        {
            Entity = "MenuItem",
            EntityId = item.Id.ToString(),
            Filename = displayName,
            FilePath = fullPath,
            FileSize = totalWritten,
            UploaderId = staffUserId,
            CreatedAt = now,
        };
        _uow.Repository<StoredFile, long>().Add(stored);
        await _uow.SaveChangesAsync(cancellationToken);

        item.ImageFileId = stored.Id;
        item.UpdatedAt = now;
        item.UpdatedById = staffUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
        return null;
    }

    public async Task<(string? PhysicalPath, string? ContentType, string? Error)> GetItemImageFileAsync(
        long itemId,
        CancellationToken cancellationToken = default)
    {
        var imageFileId = await _uow.Repository<MenuItem, long>().Query.AsNoTracking()
            .Where(i => i.Id == itemId)
            .Select(i => i.ImageFileId)
            .FirstOrDefaultAsync(cancellationToken);
        if (imageFileId is null or 0)
            return (null, null, "Artikulli nuk ka foto.");

        var file = await _uow.Repository<StoredFile, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == imageFileId.Value, cancellationToken);
        if (file is null || string.IsNullOrWhiteSpace(file.FilePath))
            return (null, null, "Skedari i fotos nuk u gjet.");
        if (!File.Exists(file.FilePath))
            return (null, null, "Skedari i fotos mungon në disk.");

        return (file.FilePath, GuessContentType(file.Filename), null);
    }

    public async Task<string?> ClearItemImageAsync(
        long staffUserId,
        long itemId,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return "Nuk je i lidhur me asnjë restorant.";

        var item = await _uow.Repository<MenuItem, long>().Query
            .Include(i => i.MenuCategory)
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken);
        if (item is null)
            return "Artikulli nuk u gjet.";
        if (item.MenuCategory.RestaurantId != restaurantId.Value)
            return "Artikulli nuk i përket restorantit tënd.";

        await RemoveItemImageCoreAsync(item, cancellationToken);
        var now = DateTime.UtcNow;
        item.UpdatedAt = now;
        item.UpdatedById = staffUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        await InvalidatePublicCatalogAsync(restaurantId.Value, cancellationToken).ConfigureAwait(false);
        return null;
    }

    private Task InvalidatePublicCatalogAsync(long restaurantId, CancellationToken cancellationToken) =>
        RestaurantCatalogCacheInvalidation.InvalidateRestaurantPublicCatalogAsync(_cache, restaurantId, cancellationToken);

    private async Task RemoveItemImageCoreAsync(MenuItem item, CancellationToken cancellationToken)
    {
        if (item.ImageFileId is null or 0)
            return;

        var fileId = item.ImageFileId.Value;
        item.ImageFileId = null;

        var sf = await _uow.Repository<StoredFile, long>().Query
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);
        if (sf is not null)
        {
            TryDeletePhysical(sf.FilePath);
            _uow.Repository<StoredFile, long>().Remove(sf);
        }

        await _uow.SaveChangesAsync(cancellationToken);
    }

    private static void TryDeletePhysical(string path)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
                File.Delete(path);
        }
        catch
        {
            /* disk — mos e blloko menunë */
        }
    }

    private static string? NormalizeImageExtension(string contentType, string fileName)
    {
        var ct = contentType.Split(';', 2)[0].Trim().ToLowerInvariant();
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is ".jpg" or ".jpeg" or ".png" or ".webp" or ".gif")
            return ext == ".jpeg" ? ".jpg" : ext;

        return ct switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => null,
        };
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

    private static string GuessContentType(string filename)
    {
        var ext = Path.GetExtension(filename).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            _ => "application/octet-stream",
        };
    }
}
