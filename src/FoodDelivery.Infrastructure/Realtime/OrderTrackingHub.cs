using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FoodDelivery.Infrastructure.Realtime;

[Authorize]
public sealed class OrderTrackingHub : Hub
{
    public Task JoinOrder(long orderId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"order-{orderId}");

    public Task JoinRestaurant(long restaurantId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"restaurant-{restaurantId}");

    /// <summary>Lidh lidhjen aktuale me grupin e korrierit (oferta të reja dërgese në kohë reale).</summary>
    public Task JoinDriver()
    {
        var id = HubUserId(Context);
        if (id is null)
            throw new HubException("Unauthorized");
        return Groups.AddToGroupAsync(Context.ConnectionId, $"driver-{id.Value}");
    }

    /// <summary>Grupi <c>user-{id}</c> — njoftime porosie për klientin në çdo faqe të /app.</summary>
    public Task JoinCustomer()
    {
        var id = HubUserId(Context);
        if (id is null)
            throw new HubException("Unauthorized");
        return Groups.AddToGroupAsync(Context.ConnectionId, $"user-{id.Value}");
    }

    /// <summary>Grupi <c>admin-{id}</c> — njoftime real-time për panelin admin.</summary>
    public Task JoinAdmin()
    {
        var id = HubUserId(Context);
        if (id is null)
            throw new HubException("Unauthorized");
        return Groups.AddToGroupAsync(Context.ConnectionId, $"admin-{id.Value}");
    }

    /// <summary>Grupi <c>kitchen-user-{id}</c> — njoftime personale për stafin e kuzhinës.</summary>
    public Task JoinKitchen()
    {
        var id = HubUserId(Context);
        if (id is null)
            throw new HubException("Unauthorized");
        return Groups.AddToGroupAsync(Context.ConnectionId, $"kitchen-user-{id.Value}");
    }

    private static long? HubUserId(HubCallerContext ctx)
    {
        var u = ctx.User;
        if (u?.Identity?.IsAuthenticated != true)
            return null;
        var v =
            u.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? u.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(v, out var parsed) ? parsed : null;
    }
}
