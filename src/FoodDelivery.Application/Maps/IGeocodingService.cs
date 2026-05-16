namespace FoodDelivery.Application.Maps;



public interface IGeocodingService

{

    /// <summary>Kthen koordinata nga adresa tekst; (null,null) nëse nuk gjendet ose dështon shërbimi.</summary>

    Task<(double? Latitude, double? Longitude)> GeocodeAddressAsync(

        string line1,

        string city,

        string? postalCode,

        CancellationToken cancellationToken = default);

}

