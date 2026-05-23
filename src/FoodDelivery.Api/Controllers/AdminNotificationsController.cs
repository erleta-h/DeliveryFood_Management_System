using FoodDelivery.Api.Security;
using FoodDelivery.Application.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/notifications")]
[Authorize]
public sealed class AdminNotificationsController : ControllerBase
{
    private readonly IAdminNotificationService _svc;

    public AdminNotificationsController(IAdminNotificationService svc) => _svc = svc;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminNotificationRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminNotificationRowDto>>> List(
        [FromQuery] int take = 30,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var list = await _svc.ListAsync(userId.Value, take, cancellationToken);
        return Ok(list);
    }

    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(NotificationUnreadCountDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<NotificationUnreadCountDto>> UnreadCount(
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var count = await _svc.UnreadCountAsync(userId.Value, cancellationToken);
        return Ok(new NotificationUnreadCountDto(count));
    }

    [HttpPost("{id:long}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkRead(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var err = await _svc.MarkReadAsync(userId.Value, id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        await _svc.MarkAllReadAsync(userId.Value, cancellationToken);
        return NoContent();
    }
}
