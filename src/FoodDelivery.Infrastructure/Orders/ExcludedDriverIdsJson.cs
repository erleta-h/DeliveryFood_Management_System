using System.Text.Json;

namespace FoodDelivery.Infrastructure.Orders;

internal static class ExcludedDriverIdsJson
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static HashSet<long> ToSet(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new HashSet<long>();
        try
        {
            var arr = JsonSerializer.Deserialize<long[]>(json, Options);
            return arr is null || arr.Length == 0 ? new HashSet<long>() : new HashSet<long>(arr);
        }
        catch
        {
            return new HashSet<long>();
        }
    }

    public static string FromSet(HashSet<long> set) =>
        set.Count == 0 ? "[]" : JsonSerializer.Serialize(set.OrderBy(x => x).ToArray(), Options);
}
