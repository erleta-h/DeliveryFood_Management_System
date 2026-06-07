using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Restaurants;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Caching;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Hosting;

namespace FoodDelivery.Infrastructure.Restaurants;

public sealed class KitchenBrandingService : IKitchenBrandingService
{
    private const long MaxLogoBytes = 2 * 1024 * 1024;
    private const long MaxCoverBytes = 5 * 1024 * 1024;
    private const string LogoEntity = "RestaurantLogo";
    private const string CoverEntity = "RestaurantCover";
    private const string BrandingRelativeRoot = "App_Data/restaurant-branding";

    private readonly IUnitOfWork _uow;
    private readonly IHostEnvironment _env;
    private readonly IDistributedCache _cache;

    public KitchenBrandingService(
        IUnitOfWork uow,
        IHostEnvironment env,
        IDistributedCache cache)
    {
        _uow = uow;
        _env = env;
        _cache = cache;
    }

    public async Task<KitchenBrandingDto?> GetBrandingAsync(
        long staffUserId,
        CancellationToken cancellationToken = default)
    {
        var restaurant = await LoadStaffRestaurantAsync(staffUserId, cancellationToken);
        if (restaurant is null)
            return null;

        return ToDto(restaurant);
    }

    public Task<string?> SetLogoAsync(
        long staffUserId,
        Stream fileStream,
        string originalFileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default) =>
        SetBrandingImageAsync(
            staffUserId,
            isLogo: true,
            fileStream,
            originalFileName,
            contentType,
            contentLength,
            MaxLogoBytes,
            LogoEntity,
            cancellationToken);

    public Task<string?> SetCoverAsync(
        long staffUserId,
        Stream fileStream,
        string originalFileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default) =>
        SetBrandingImageAsync(
            staffUserId,
            isLogo: false,
            fileStream,
            originalFileName,
            contentType,
            contentLength,
            MaxCoverBytes,
            CoverEntity,
            cancellationToken);

    public async Task<string?> ClearLogoAsync(long staffUserId, CancellationToken cancellationToken = default)
    {
        var restaurant = await LoadStaffRestaurantTrackedAsync(staffUserId, cancellationToken);
        if (restaurant is null)
            return "Nuk je i lidhur me asnjë restorant.";

        await RemoveBrandingFileAsync(restaurant, isLogo: true, cancellationToken);
        await SaveRestaurantBrandingAsync(restaurant, staffUserId, cancellationToken);
        return null;
    }

    public async Task<string?> ClearCoverAsync(long staffUserId, CancellationToken cancellationToken = default)
    {
        var restaurant = await LoadStaffRestaurantTrackedAsync(staffUserId, cancellationToken);
        if (restaurant is null)
            return "Nuk je i lidhur me asnjë restorant.";

        await RemoveBrandingFileAsync(restaurant, isLogo: false, cancellationToken);
        await SaveRestaurantBrandingAsync(restaurant, staffUserId, cancellationToken);
        return null;
    }

    private async Task<string?> SetBrandingImageAsync(
        long staffUserId,
        bool isLogo,
        Stream fileStream,
        string originalFileName,
        string contentType,
        long contentLength,
        long maxBytes,
        string entityName,
        CancellationToken cancellationToken)
    {
        if (contentLength <= 0 || contentLength > maxBytes)
            return $"Fotoja duhet të jetë midis 1 bajt dhe {maxBytes / 1024 / 1024} MB.";

        var ext = NormalizeImageExtension(contentType, originalFileName);
        if (ext is null)
            return "Formati i lejuar: JPEG ose PNG.";

        var restaurant = await LoadStaffRestaurantTrackedAsync(staffUserId, cancellationToken);
        if (restaurant is null)
            return "Nuk je i lidhur me asnjë restorant.";

        await RemoveBrandingFileAsync(restaurant, isLogo, cancellationToken);

        var root = Path.GetFullPath(Path.Combine(_env.ContentRootPath, BrandingRelativeRoot));
        Directory.CreateDirectory(root);
        var kind = isLogo ? "logo" : "cover";
        var safeName = $"{restaurant.Id}_{kind}_{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(root, safeName);

        long totalWritten = 0;
        await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            var buffer = new byte[81920];
            int read;
            while ((read = await fileStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
            {
                totalWritten += read;
                if (totalWritten > maxBytes)
                {
                    TryDeletePhysical(fullPath);
                    return $"Fotoja duhet të jetë maksimum {maxBytes / 1024 / 1024} MB.";
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
            Entity = entityName,
            EntityId = restaurant.Id.ToString(),
            Filename = displayName,
            FilePath = fullPath,
            FileSize = totalWritten,
            UploaderId = staffUserId,
            CreatedById = staffUserId,
            CreatedAt = now,
        };
        _uow.Repository<StoredFile, long>().Add(stored);
        await _uow.SaveChangesAsync(cancellationToken);

        if (isLogo)
            restaurant.LogoFileId = stored.Id;
        else
            restaurant.CoverFileId = stored.Id;

        await SaveRestaurantBrandingAsync(restaurant, staffUserId, cancellationToken);
        return null;
    }

    private async Task SaveRestaurantBrandingAsync(
        Restaurant restaurant,
        long staffUserId,
        CancellationToken cancellationToken)
    {
        restaurant.UpdatedAt = DateTime.UtcNow;
        restaurant.UpdatedById = staffUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        await RestaurantCatalogCacheInvalidation
            .InvalidateRestaurantPublicCatalogAsync(_cache, restaurant.Id, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task RemoveBrandingFileAsync(
        Restaurant restaurant,
        bool isLogo,
        CancellationToken cancellationToken)
    {
        var fileId = isLogo ? restaurant.LogoFileId : restaurant.CoverFileId;
        if (fileId is null or 0)
            return;

        if (isLogo)
            restaurant.LogoFileId = null;
        else
            restaurant.CoverFileId = null;

        var sf = await _uow.Repository<StoredFile, long>().Query
            .FirstOrDefaultAsync(f => f.Id == fileId.Value, cancellationToken);
        if (sf is not null)
        {
            TryDeletePhysical(sf.FilePath);
            _uow.Repository<StoredFile, long>().Remove(sf);
        }

        await _uow.SaveChangesAsync(cancellationToken);
    }

    private async Task<Restaurant?> LoadStaffRestaurantAsync(long staffUserId, CancellationToken cancellationToken)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return null;

        return await _uow.Repository<Restaurant, long>().Query
            .AsNoTracking()
            .Include(r => r.FoodCategory)
            .FirstOrDefaultAsync(r => r.Id == restaurantId.Value, cancellationToken);
    }

    private async Task<Restaurant?> LoadStaffRestaurantTrackedAsync(long staffUserId, CancellationToken cancellationToken)
    {
        var restaurantId = await GetStaffRestaurantIdAsync(staffUserId, cancellationToken);
        if (restaurantId is null)
            return null;

        return await _uow.Repository<Restaurant, long>().Query
            .Include(r => r.FoodCategory)
            .FirstOrDefaultAsync(r => r.Id == restaurantId.Value, cancellationToken);
    }

    private static KitchenBrandingDto ToDto(Restaurant restaurant) =>
        new(
            restaurant.Id,
            restaurant.Name,
            restaurant.FoodCategory.Name,
            RestaurantBrandingImageUrls.PublicUrl(restaurant.LogoFileId),
            RestaurantBrandingImageUrls.PublicUrl(restaurant.CoverFileId),
            restaurant.LogoFileId is > 0,
            restaurant.CoverFileId is > 0);

    private async Task<long?> GetStaffRestaurantIdAsync(long staffUserId, CancellationToken cancellationToken) =>
        await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => (long?)s.RestaurantId)
            .FirstOrDefaultAsync(cancellationToken);

    private static void TryDeletePhysical(string path)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
                File.Delete(path);
        }
        catch
        {
            /* disk */
        }
    }

    private static string? NormalizeImageExtension(string contentType, string fileName)
    {
        var ct = contentType.Split(';', 2)[0].Trim().ToLowerInvariant();
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is ".jpg" or ".jpeg" or ".png")
            return ext == ".jpeg" ? ".jpg" : ext;

        return ct switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            _ => null,
        };
    }
}
