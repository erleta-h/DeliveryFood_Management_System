namespace FoodDelivery.Application.Auth;

public interface IJwtTokenIssuer
{
    string CreateAccessToken(
        long userId,
        string email,
        IReadOnlyList<string> roles,
        out DateTime expiresAtUtc);
}
