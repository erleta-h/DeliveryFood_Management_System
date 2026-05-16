using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Maps;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Maps;

/// <summary>Zgjedh Google ose Nominatim sipas <see cref="GoogleMapsSettings.GeocodingProvider"/>.</summary>
public sealed class CompositeGeocodingService : IGeocodingService
{
    private readonly GoogleMapsSettings _settings;
    private readonly GoogleGeocodingService _google;
    private readonly NominatimGeocodingService _nominatim;

    public CompositeGeocodingService(
        IOptions<GoogleMapsSettings> options,
        GoogleGeocodingService google,
        NominatimGeocodingService nominatim)
    {
        _settings = options.Value;
        _google = google;
        _nominatim = nominatim;
    }

    public Task<(double? Latitude, double? Longitude)> GeocodeAddressAsync(
        string line1,
        string city,
        string? postalCode,
        CancellationToken cancellationToken = default)
    {
        var p = _settings.GeocodingProvider?.Trim();
        var useGoogle = string.Equals(p, "Google", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(_settings.ServerApiKey);

        if (useGoogle)
            return _google.GeocodeAddressAsync(line1, city, postalCode, cancellationToken);

        return _nominatim.GeocodeAddressAsync(line1, city, postalCode, cancellationToken);
    }
}
