namespace FoodDelivery.Application.Auth;

public record AuthUserDto(
    string Email,
    string FirstName,
    string LastName,
    string Phone,
    string Line1,
    string City,
    string? PostalCode,
    bool MustChangePassword);

public record AuthResponseDto(string Token, DateTime ExpiresAtUtc, AuthUserDto User);

public record RegisterCustomerRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string Phone,
    string Line1,
    string City,
    string? PostalCode);

public record LoginRequest(string Email, string Password);

public record UpdateCustomerProfileRequest(string? Line1, string? City, string? PostalCode, string? Phone);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
