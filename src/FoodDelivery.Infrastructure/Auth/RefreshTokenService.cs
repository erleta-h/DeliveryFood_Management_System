using System.Security.Cryptography;
using System.Text;
using FoodDelivery.Application.Auth;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Auth;

public sealed class RefreshTokenService : IRefreshTokenService
{
    private readonly IUnitOfWork _uow;
    private readonly JwtSettings _jwt;

    public RefreshTokenService(IUnitOfWork uow, IOptions<JwtSettings> jwt)
    {
        _uow = uow;
        _jwt = jwt.Value;
    }

    public async Task<(string PlainToken, DateTime ExpiresAtUtc)> CreateAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        var plain = GeneratePlainToken();
        var now = DateTime.UtcNow;
        var expires = now.AddDays(Math.Max(1, _jwt.RefreshTokenDays));

        _uow.Repository<RefreshToken, long>().Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = Hash(plain),
            ExpiresAt = expires,
            CreatedAt = now,
        });

        await _uow.SaveChangesAsync(cancellationToken);
        return (plain, expires);
    }

    public async Task<(string PlainToken, DateTime ExpiresAtUtc, long UserId)?> RotateAsync(
        string plainToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(plainToken))
            return null;

        var hash = Hash(plainToken);
        var existing = await _uow.Repository<RefreshToken, long>().Query
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (existing is null)
            return null;

        var now = DateTime.UtcNow;

        if (existing.RevokedAt is not null)
        {
            await RevokeAllForUserAsync(existing.UserId, cancellationToken);
            return null;
        }

        if (existing.ExpiresAt <= now)
        {
            existing.RevokedAt = now;
            existing.UpdatedAt = now;
            await _uow.SaveChangesAsync(cancellationToken);
            return null;
        }

        var user = await _uow.Repository<User, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == existing.UserId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            existing.RevokedAt = now;
            existing.UpdatedAt = now;
            await _uow.SaveChangesAsync(cancellationToken);
            return null;
        }

        existing.RevokedAt = now;
        existing.UpdatedAt = now;

        var plain = GeneratePlainToken();
        var expires = now.AddDays(Math.Max(1, _jwt.RefreshTokenDays));

        _uow.Repository<RefreshToken, long>().Add(new RefreshToken
        {
            UserId = existing.UserId,
            TokenHash = Hash(plain),
            ExpiresAt = expires,
            CreatedAt = now,
        });

        await _uow.SaveChangesAsync(cancellationToken);
        return (plain, expires, existing.UserId);
    }

    public async Task RevokeAsync(string plainToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(plainToken))
            return;

        var hash = Hash(plainToken);
        var token = await _uow.Repository<RefreshToken, long>().Query
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.RevokedAt == null, cancellationToken);
        if (token is null)
            return;

        var now = DateTime.UtcNow;
        token.RevokedAt = now;
        token.UpdatedAt = now;
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeAllForUserAsync(long userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var active = await _uow.Repository<RefreshToken, long>().Query
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var t in active)
        {
            t.RevokedAt = now;
            t.UpdatedAt = now;
        }

        if (active.Count > 0)
            await _uow.SaveChangesAsync(cancellationToken);
    }

    private static string GeneratePlainToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string Hash(string plain) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plain)));
}
