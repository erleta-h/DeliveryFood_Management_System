using System.Text;
using System.Text.Json;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Maps;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Maps;

public sealed class GoogleGeocodingService : IGeocodingService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly GoogleMapsSettings _settings;

    public GoogleGeocodingService(IHttpClientFactory httpFactory, IOptions<GoogleMapsSettings> settings)
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
        if (string.IsNullOrWhiteSpace(_settings.ServerApiKey))
            return (null, null);

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

        var address = sb.ToString();
        var key = Uri.EscapeDataString(_settings.ServerApiKey.Trim());
        var path =
            $"maps/api/geocode/json?address={Uri.EscapeDataString(address)}&key={key}";

        var http = _httpFactory.CreateClient(GoogleMapsDistanceService.HttpClientName);
        using var res = await http.GetAsync(path, cancellationToken);
        if (!res.IsSuccessStatusCode)
            return (null, null);

        await using var stream = await res.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = doc.RootElement;

        if (root.GetProperty("status").GetString() is not "OK")
            return (null, null);

        if (!root.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
            return (null, null);

        var loc = results[0].GetProperty("geometry").GetProperty("location");
        var lat = loc.GetProperty("lat").GetDouble();
        var lng = loc.GetProperty("lng").GetDouble();
        if (double.IsNaN(lat) || double.IsNaN(lng) || double.IsInfinity(lat) || double.IsInfinity(lng))
            return (null, null);

        return (lat, lng);
    }
}
