namespace FoodDelivery.Application.Partners;

public record PartnerApplicationListItemDto(
    long Id,
    DateTime CreatedAtUtc,
    byte Status,
    string VenueName,
    string City,
    string Email,
    string ContactFirstName,
    string ContactLastName);

public record ApprovePartnerApplicationRequest(string? InitialPassword);

public record ApprovePartnerApplicationResultDto(
    string StaffEmail,
    string TemporaryPassword,
    long RestaurantId,
    string RestaurantName,
    string RestaurantSlug);

/// <param name="NewPassword">Nëse null / bosh, gjenerohet fjalëkalim i përkohshëm si në miratim.</param>
public record ResetPartnerStaffPasswordRequest(string? NewPassword);

public record ResetPartnerStaffPasswordResultDto(string StaffEmail, string NewPassword);
