namespace FoodDelivery.Application.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterCustomerAsync(RegisterCustomerRequest request, CancellationToken cancellationToken = default);

    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    Task<AuthResult> RefreshAsync(string refreshTokenPlain, CancellationToken cancellationToken = default);

    Task LogoutAsync(string? refreshTokenPlain, CancellationToken cancellationToken = default);

    Task<AuthUserDto?> GetProfileAsync(long userId, CancellationToken cancellationToken = default);

    /// <returns>(User, null) sukses; (null, ValidationError) gabim validimi; (null, null) përdoruesi nuk u gjet.</returns>
    Task<(AuthUserDto? User, string? ValidationError)> UpdateProfileAsync(
        long userId,
        UpdateCustomerProfileRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Rivendos fjalëkalimin për përdoruesin e kyçur; anulon refresh token-et.</summary>
    /// <returns>null në sukses, mesazh gabimi përndryshe.</returns>
    Task<string?> ChangePasswordAsync(
        long userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default);

    /// <returns>null në sukses, mesazh gabimi përndryshe.</returns>
    Task<string?> ActivateAccountAsync(
        ActivateAccountRequest request,
        CancellationToken cancellationToken = default);
}

public sealed class AuthResult
{
    public bool Success { get; private init; }
    public AuthResponseDto? Data { get; private init; }
    public string? Error { get; private init; }
    public AuthErrorCode? Code { get; private init; }
    /// <summary>Plaintext refresh — vetëm për vendosje cookie; mos e kthe në JSON.</summary>
    public string? RefreshTokenPlain { get; private init; }

    public static AuthResult Ok(AuthResponseDto data, string? refreshTokenPlain = null) =>
        new() { Success = true, Data = data, RefreshTokenPlain = refreshTokenPlain };

    public static AuthResult Fail(string message, AuthErrorCode code) =>
        new() { Success = false, Error = message, Code = code };
}

public enum AuthErrorCode
{
    DuplicateEmail,
    InvalidCredentials,
    InactiveUser,
    PendingActivation,
    RoleMissing,
    Validation,
    InvalidRefreshToken,
}
