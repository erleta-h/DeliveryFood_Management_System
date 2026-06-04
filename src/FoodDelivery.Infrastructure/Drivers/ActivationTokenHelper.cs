using System.Security.Cryptography;
using System.Text;

namespace FoodDelivery.Infrastructure.Drivers;

internal static class ActivationTokenHelper
{
    internal static string GeneratePlainToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    internal static string HashToken(string plainToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(plainToken));
        return Convert.ToHexString(hash);
    }
}
