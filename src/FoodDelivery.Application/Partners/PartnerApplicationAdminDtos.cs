namespace FoodDelivery.Application.Partners;

public record PartnerApplicationListItemDto(
    long Id,
    DateTime CreatedAtUtc,
    byte Status,
    string VenueName,
    string City,
    string Email,
    string ContactFirstName,
    string ContactLastName,
    string Phone,
    string BusinessType,
    string VenueCountLabel,
    string StreetAddress,
    string? Message);

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

public record PartnerContractDocumentDto(
    string Filename,
    long FileSize,
    DateTime UploadedAtUtc,
    string? UploadedByName,
    string DownloadUrl);

public record PartnerApplicationAuditEntryDto(
    string EventType,
    string? Detail,
    DateTime CreatedAtUtc,
    string? ActorName);

public record PartnerApplicationDetailDto(
    long Id,
    DateTime CreatedAtUtc,
    byte Status,
    string VenueName,
    string City,
    string Email,
    string ContactFirstName,
    string ContactLastName,
    string Phone,
    string BusinessType,
    string VenueCountLabel,
    string StreetAddress,
    string? Message,
    string Country,
    string PostalCode,
    bool HasContract,
    PartnerContractDocumentDto? Contract,
    IReadOnlyList<PartnerApplicationAuditEntryDto> History);
