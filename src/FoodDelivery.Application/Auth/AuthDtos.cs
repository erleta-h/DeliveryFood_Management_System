namespace FoodDelivery.Application.Auth;

public record RegisterCustomerRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string Phone,
    string Line1,
    string City,
    string? PostalCode,
    double? Latitude = null,
    double? Longitude = null);

public record LoginRequest(string Email, string Password);

public record AuthResponseDto(
    string Token,
    DateTime ExpiresAtUtc,
    AuthUserDto User,
    DateTime RefreshExpiresAtUtc);

public record AuthUserDto(
    string Email,
    string FirstName,
    string LastName,
    string Phone,
    string Line1,
    string City,
    string? PostalCode,
    bool MustChangePassword);

public record UpdateCustomerProfileRequest(
    string? Phone,
    string? Line1,
    string? City,
    string? PostalCode,
    double? Latitude,
    double? Longitude);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record ActivateAccountRequest(
    string Token,
    string? Email,
    string NewPassword,
    string ConfirmPassword);
