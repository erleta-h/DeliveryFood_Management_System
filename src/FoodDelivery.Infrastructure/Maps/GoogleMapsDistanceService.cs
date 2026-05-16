using System.Globalization;
using System.Text.Json;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Maps;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Maps;

public sealed class GoogleMapsDistanceService : IGoogleMapsDistanceService
{
    public const string HttpClientName = "GoogleMapsDistanceMatrix";

    private readonly IHttpClientFactory _httpFactory;
    private readonly GoogleMapsSettings _settings;

    public GoogleMapsDistanceService(IHttpClientFactory httpFactory, IOptions<GoogleMapsSettings> settings)
    {
        _httpFactory = httpFactory;
        _settings = settings.Value;
    }

    public async Task<DrivingMatrixResult> GetDrivingAsync(
        double originLat,
        double originLng,
        double destLat,
        double destLng,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ServerApiKey))
        {
            return new DrivingMatrixResult(false, null, null, "Distance Matrix nuk është konfiguruar (GoogleMaps:ServerApiKey).");
        }

        var inv = CultureInfo.InvariantCulture;
        var origins =
            $"{originLat.ToString("F6", inv)},{originLng.ToString("F6", inv)}";
        var dests =
            $"{destLat.ToString("F6", inv)},{destLng.ToString("F6", inv)}";
        var key = Uri.EscapeDataString(_settings.ServerApiKey.Trim());
        var path =
            $"maps/api/distancematrix/json?origins={Uri.EscapeDataString(origins)}&destinations={Uri.EscapeDataString(dests)}&mode=driving&key={key}";

        var http = _httpFactory.CreateClient(HttpClientName);
        using var res = await http.GetAsync(path, cancellationToken);
        if (!res.IsSuccessStatusCode)
            return new DrivingMatrixResult(false, null, null, $"HTTP {(int)res.StatusCode}");

        await using var stream = await res.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = doc.RootElement;

        if (root.GetProperty("status").GetString() is not "OK")
        {
            var err = root.TryGetProperty("error_message", out var em) ? em.GetString() : "STATUS_NOT_OK";
            return new DrivingMatrixResult(false, null, null, err);
        }

        if (!root.TryGetProperty("rows", out var rows) || rows.GetArrayLength() == 0)
            return new DrivingMatrixResult(false, null, null, "Nuk ka rreshta në përgjigje.");

        var firstRow = rows[0];
        if (!firstRow.TryGetProperty("elements", out var elements) || elements.GetArrayLength() == 0)
            return new DrivingMatrixResult(false, null, null, "Nuk ka elemente në përgjigje.");

        var el = elements[0];
        var elStatus = el.GetProperty("status").GetString();
        if (elStatus != "OK")
            return new DrivingMatrixResult(false, null, null, elStatus ?? "ELEMENT_NOT_OK");

        var meters = el.GetProperty("distance").GetProperty("value").GetInt32();
        var seconds = el.GetProperty("duration").GetProperty("value").GetInt32();
        return new DrivingMatrixResult(true, meters, seconds, null);
    }
}
