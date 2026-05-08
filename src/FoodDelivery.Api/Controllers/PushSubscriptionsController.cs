using FoodDelivery.Api.Security;
using FoodDelivery.Application.Realtime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/push")]
[Authorize(Roles = "Customer")]
public class PushSubscriptionsController : ControllerBase
{
    private readonly IWebPushSubscriptionService _subscriptions;

    public PushSubscriptionsController(IWebPushSubscriptionService subscriptions)
    {
        _subscriptions = subscriptions;
    }

    [HttpPost("subscribe")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Subscribe(
        [FromBody] WebPushSubscribeRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var err = await _subscriptions.RegisterAsync(userId.Value, body, cancellationToken);
        return err is null ? NoContent() : BadRequest(new { message = err });
    }
}
