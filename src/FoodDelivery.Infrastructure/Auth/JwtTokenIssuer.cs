using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Linq;
using FoodDelivery.Application.Auth;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Security;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FoodDelivery.Infrastructure.Auth;

public sealed class JwtTokenIssuer : IJwtTokenIssuer
{
    private readonly JwtSettings _jwt;

    public JwtTokenIssuer(IOptions<JwtSettings> options)
    {
        _jwt = options.Value;
    }

    public string CreateAccessToken(
        long userId,
        string email,
        IReadOnlyList<string> roles,
        IReadOnlyList<string> permissionNames,
        out DateTime expiresAtUtc)
    {
        expiresAtUtc = DateTime.UtcNow.AddMinutes(Math.Max(1, _jwt.AccessTokenMinutes));
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var roleList = roles is { Count: > 0 }
            ? roles.Distinct(StringComparer.Ordinal).ToList()
            : new List<string> { "Customer" };
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
        };
        foreach (var r in roleList)
            claims.Add(new Claim(ClaimTypes.Role, r));
        foreach (var p in permissionNames.Distinct(StringComparer.Ordinal))
            claims.Add(new Claim(PermissionClaimTypes.Permission, p));
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
