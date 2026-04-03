using System.Security.Claims;

namespace FoodDelivery.Api.Security;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Lexon <c>sub</c> / NameIdentifier nga JWT (pas MapInboundClaims).</summary>
    public static long? GetUserId(this ClaimsPrincipal? principal)
    {
        var sub = principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(sub, out var id) ? id : null;
    }
}
