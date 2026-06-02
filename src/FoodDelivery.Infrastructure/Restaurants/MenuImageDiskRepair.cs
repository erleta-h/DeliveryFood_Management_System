using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Caching;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Restaurants;

/// <summary>
/// Lidh skedarët në disk (pas dështimit të INSERT në Files) me MenuItems.ImageFileId.
/// </summary>
public static class MenuImageDiskRepair
{
    public static async Task<int> RepairAsync(
        FoodDeliveryDbContext db,
        IDistributedCache cache,
        string contentRootPath,
        string relativeRoot,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var root = Path.GetFullPath(Path.Combine(contentRootPath, relativeRoot));
        if (!Directory.Exists(root))
            return 0;

        var latestByItemId = new Dictionary<long, (string Path, DateTime Modified)>();
        foreach (var path in Directory.EnumerateFiles(root))
        {
            var name = Path.GetFileName(path);
            var sep = name.IndexOf('_', StringComparison.Ordinal);
            if (sep <= 0 || !long.TryParse(name.AsSpan(0, sep), out var itemId))
                continue;

            var modified = File.GetLastWriteTimeUtc(path);
            if (!latestByItemId.TryGetValue(itemId, out var existing) || modified > existing.Modified)
                latestByItemId[itemId] = (path, modified);
        }

        if (latestByItemId.Count == 0)
            return 0;

        var itemIds = latestByItemId.Keys.ToList();
        var items = await db.MenuItems
            .Include(i => i.MenuCategory)
            .Where(i => i.ImageFileId == null && itemIds.Contains(i.Id))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (items.Count == 0)
            return 0;

        var uploaderId = await db.Users.AsNoTracking()
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        if (uploaderId == 0)
            uploaderId = 1;

        var now = DateTime.UtcNow;
        var restaurantIds = new HashSet<long>();
        var repaired = 0;

        foreach (var item in items)
        {
            if (!latestByItemId.TryGetValue(item.Id, out var file))
                continue;

            var fullPath = file.Path;
            if (!File.Exists(fullPath))
                continue;

            var fi = new FileInfo(fullPath);
            var stored = new StoredFile
            {
                Entity = "MenuItem",
                EntityId = item.Id.ToString(),
                Filename = fi.Name,
                FilePath = fullPath,
                FileSize = fi.Length,
                UploaderId = uploaderId,
                CreatedAt = now,
            };
            db.StoredFiles.Add(stored);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            item.ImageFileId = stored.Id;
            item.UpdatedAt = now;
            repaired++;
            restaurantIds.Add(item.MenuCategory.RestaurantId);
        }

        if (repaired > 0)
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            foreach (var rid in restaurantIds)
            {
                await RestaurantCatalogCacheInvalidation
                    .InvalidateRestaurantPublicCatalogAsync(cache, rid, cancellationToken)
                    .ConfigureAwait(false);
            }

            logger.LogInformation(
                "MenuImageDiskRepair: u lidhën {Count} foto artikujsh nga disku me databazën.",
                repaired);
        }

        return repaired;
    }
}
