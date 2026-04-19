namespace FoodDelivery.Application.Partners;

public record SubmitPartnerApplicationRequest(
    string Country,
    string BusinessType,
    string VenueCountLabel,
    string VenueName,
    string StreetAddress,
    string PostalCode,
    string City,
    string ContactFirstName,
    string ContactLastName,
    string Phone,
    string Email,
    string? Message);
