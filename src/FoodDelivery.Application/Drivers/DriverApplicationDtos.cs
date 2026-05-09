namespace FoodDelivery.Application.Drivers;

public record SubmitDriverApplicationRequest(
    string FirstName,
    string LastName,
    string Phone,
    string Email,
    string VehicleType,
    string? LicensePlate,
    string? Message);

public record DriverApplicationListItemDto(
    long Id,
    DateTime CreatedAtUtc,
    int Status,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string VehicleType,
    string? LicensePlate);

/// <param name="InitialPassword">null = gjenerohet.</param>
public record ApproveDriverApplicationRequest(string? InitialPassword);

public record ApproveDriverApplicationResultDto(string Email, string TemporaryPassword);
