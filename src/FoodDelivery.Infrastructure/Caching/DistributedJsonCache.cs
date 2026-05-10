using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace FoodDelivery.Infrastructure.Caching;


/// Serializon vlerat në Redis / memorie përmes <see cref="IDistributedCache"/> (JSON camelCase).

internal static class DistributedJsonCache
{
    internal static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public static async Task<T?> GetAsync<T>(IDistributedCache cache, string key, CancellationToken cancellationToken)
    {
        var raw = await cache.GetStringAsync(key, cancellationToken).ConfigureAwait(false);
        if (string.IsNullOrEmpty(raw))
            return default;

        try
        {
            return JsonSerializer.Deserialize<T>(raw, SerializerOptions);
        }
        catch (JsonException)
        {
            return default;
        }
    }

    public static Task SetAsync<T>(
        IDistributedCache cache,
        string key,
        T value,
        TimeSpan absoluteExpirationRelativeToNow,
        CancellationToken cancellationToken) =>
        cache.SetStringAsync(
            key,
            JsonSerializer.Serialize(value, SerializerOptions),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = absoluteExpirationRelativeToNow },
            cancellationToken);
}
