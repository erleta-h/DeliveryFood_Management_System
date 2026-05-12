namespace FoodDelivery.Application.Configuration;

/// <summary>Celësi publik për Maps JavaScript API në shfletues; opsionale Distance Matrix në server.</summary>
public sealed class GoogleMapsSettings
{
    public const string SectionName = "GoogleMaps";

    /// <summary>Celës i kufizuar me HTTP referrer (për embed në React).</summary>
    public string? BrowserApiKey { get; set; }

    /// <summary>Celës server për Distance Matrix, Geocoding, etj. (mos e ekspozo në front).</summary>
    public string? ServerApiKey { get; set; }

    /// <summary>Shtohet në kërkesën e Geocoding (p.sh. «Kosovo») për rezultate më të sakta.</summary>
    public string? GeocodeRegion { get; set; }

    /// <summary>
    /// <c>Nominatim</c> — OpenStreetMap, falas, pa API key (kufizim ~1 kërkesë/s, për zhvillim / trafik të ulët).
    /// <c>Google</c> — kërkon <see cref="ServerApiKey"/> dhe Geocoding API në Google Cloud.
    /// </summary>
    public string GeocodingProvider { get; set; } = "Nominatim";

    /// <summary>User-Agent për Nominatim (OSM e kërkon); përfshi emër app + kontakt (mailto: ose URL).</summary>
    public string? NominatimUserAgent { get; set; }
}
