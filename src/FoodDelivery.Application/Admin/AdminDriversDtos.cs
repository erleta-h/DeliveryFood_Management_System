namespace FoodDelivery.Application.Admin;

public sealed record AdminDriverListItemDto(
    long UserId,
    string Email,
    string FirstName,
    string LastName,
    bool UserIsActive,
    string VehicleType,
    string? LicensePlate,
    bool IsOnline,
    double? LastLatitude,
    double? LastLongitude,
    DateTime? LastLocationAtUtc,
    DateTime CreatedAt);

public sealed record AdminDriverListResultDto(
    IReadOnlyList<AdminDriverListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminDriverPatchRequest(bool? UserIsActive, bool? IsOnline);
