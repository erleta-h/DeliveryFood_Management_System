using Microsoft.Extensions.Caching.Distributed;

namespace FoodDelivery.Infrastructure.Caching;

internal static class AdminDashboardCacheInvalidation
{
    public static Task InvalidateAsync(IDistributedCache cache, CancellationToken cancellationToken = default) =>
        cache.RemoveAsync(AdminDashboardCacheKeys.Dashboard, cancellationToken);
}
