namespace FoodDelivery.Application.Auth;

public interface IRefreshTokenService
{
    Task<(string PlainToken, DateTime ExpiresAtUtc)> CreateAsync(long userId, CancellationToken cancellationToken = default);

    Task<(string PlainToken, DateTime ExpiresAtUtc, long UserId)?> RotateAsync(
        string plainToken,
        CancellationToken cancellationToken = default);

    Task RevokeAsync(string plainToken, CancellationToken cancellationToken = default);

    Task RevokeAllForUserAsync(long userId, CancellationToken cancellationToken = default);
}
