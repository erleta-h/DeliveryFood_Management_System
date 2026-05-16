using System.Globalization;
using System.Text;
using System.Text.Json;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Maps;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Maps;

/// <summary>Geocoding falas përmes OpenStreetMap Nominatim (pa API key; respekto politikat e përdorimit).</summary>
public sealed class NominatimGeocodingService : IGeocodingService
{
    public const string HttpClientName = "Nominatim";

    private readonly IHttpClientFactory _httpFactory;
    private readonly GoogleMapsSettings _settings;

    public NominatimGeocodingService(IHttpClientFactory httpFactory, IOptions<GoogleMapsSettings> settings)
    {
        _httpFactory = httpFactory;
        _settings = settings.Value;
    }

    public async Task<(double? Latitude, double? Longitude)> GeocodeAddressAsync(
        string line1,
        string city,
        string? postalCode,
        CancellationToken cancellationToken = default)
    {
        var l1 = line1.Trim();
        var c = city.Trim();
        if (string.IsNullOrEmpty(l1) || string.IsNullOrEmpty(c))
            return (null, null);

        var sb = new StringBuilder();
        sb.Append(l1).Append(", ").Append(c);
        if (!string.IsNullOrWhiteSpace(postalCode))
            sb.Append(", ").Append(postalCode.Trim());
        var region = string.IsNullOrWhiteSpace(_settings.GeocodeRegion)
            ? "Kosovo"
            : _settings.GeocodeRegion.Trim();
        sb.Append(", ").Append(region);

        var query = sb.ToString();
        var ua = string.IsNullOrWhiteSpace(_settings.NominatimUserAgent)
            ? "FoodDelivery/1.0"
            : _settings.NominatimUserAgent.Trim();

        var path =
            $"search?format=json&limit=1&addressdetails=0&q={Uri.EscapeDataString(query)}";

        var http = _httpFactory.CreateClient(HttpClientName);
        using var req = new HttpRequestMessage(HttpMethod.Get, path);
        req.Headers.TryAddWithoutValidation("User-Agent", ua);
        req.Headers.TryAddWithoutValidation("Accept-Language", "en");

        using var res = await http.SendAsync(req, cancellationToken);
        if (!res.IsSuccessStatusCode)
            return (null, null);

        await using var stream = await res.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
            return (null, null);

        var first = doc.RootElement[0];
        if (!first.TryGetProperty("lat", out var latEl) || !first.TryGetProperty("lon", out var lonEl))
            return (null, null);

        var latStr = latEl.GetString();
        var lonStr = lonEl.GetString();
        if (string.IsNullOrEmpty(latStr) || string.IsNullOrEmpty(lonStr))
            return (null, null);

        if (!double.TryParse(latStr, NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)
            || !double.TryParse(lonStr, NumberStyles.Float, CultureInfo.InvariantCulture, out var lng))
            return (null, null);

        if (double.IsNaN(lat) || double.IsNaN(lng) || double.IsInfinity(lat) || double.IsInfinity(lng))
            return (null, null);

        return (lat, lng);
    }
}
