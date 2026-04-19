namespace FoodDelivery.Domain.Entities;

/// <summary>Aplikim fillimor nga restoranti (lead). Login krijohet vetëm pasi admini e miraton pas kontratës.</summary>
public class RestaurantPartnerApplication
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }

    public string Country { get; set; } = string.Empty;
    public string BusinessType { get; set; } = string.Empty;
    public string VenueCountLabel { get; set; } = string.Empty;
    public string VenueName { get; set; } = string.Empty;
    public string StreetAddress { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string ContactFirstName { get; set; } = string.Empty;
    public string ContactLastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Message { get; set; }

    /// <summary>0 = në pritje, 1 = kontaktuar, 2 = miratuar (gati për onboarding), 9 = refuzuar.</summary>
    public byte Status { get; set; }
}
