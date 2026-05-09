using FoodDelivery.Application.Auth;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/driver")]
[Authorize(Roles = "Driver")]
public sealed class DriverPanelController : ControllerBase
{
    private readonly IDriverDeliveryService _svc;
    private readonly IAuthService _auth;

    public DriverPanelController(IDriverDeliveryService svc, IAuthService auth)
    {
        _svc = svc;
        _auth = auth;
    }

    [HttpGet("me/account")]
    [ProducesResponseType(typeof(DriverAccountProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DriverAccountProfileDto>> Account(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var dto = await _svc.GetDriverAccountAsync(userId.Value, cancellationToken);
        return dto is null
            ? NotFound(new { message = "Profili Deliver nuk u gjet. Kontakto administratorin." })
            : Ok(dto);
    }

    [HttpPatch("me/account")]
    [ProducesResponseType(typeof(DriverAccountProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DriverAccountProfileDto>> PatchAccount(
        [FromBody] UpdateCustomerProfileRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (updated, validationError) = await _auth.UpdateProfileAsync(userId.Value, body, cancellationToken);
        if (validationError is not null)
            return BadRequest(new { message = validationError });
        if (updated is null)
            return Unauthorized();

        var full = await _svc.GetDriverAccountAsync(userId.Value, cancellationToken);
        return full is null
            ? NotFound(new { message = "Profili Deliver nuk u gjet pas përditësimit." })
            : Ok(full);
    }

    [HttpGet("me/status")]
    [ProducesResponseType(typeof(DriverStatusDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DriverStatusDto>> Status(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var dto = await _svc.GetStatusAsync(userId.Value, cancellationToken);
        return Ok(dto);
    }

    [HttpPost("me/online")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GoOnline(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var err = await _svc.SetOnlineAsync(userId.Value, cancellationToken);
        if (err is not null) return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpPost("me/offline")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GoOffline(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var err = await _svc.SetOfflineAsync(userId.Value, cancellationToken);
        if (err is not null) return BadRequest(new { message = err });
        return NoContent();
    }

    public sealed record PostDriverLocationBody(double Latitude, double Longitude);

    [HttpPost("me/location")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> PostLocation(
        [FromBody] PostDriverLocationBody body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        await _svc.PostLocationAsync(userId.Value, body.Latitude, body.Longitude, cancellationToken);
        return NoContent();
    }

    [HttpGet("earnings")]
    [ProducesResponseType(typeof(DriverEarningsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DriverEarningsDto>> Earnings(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        return Ok(await _svc.GetEarningsAsync(userId.Value, cancellationToken));
    }

    [HttpGet("history")]
    [ProducesResponseType(typeof(IReadOnlyList<DriverHistoryRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DriverHistoryRowDto>>> History(
        [FromQuery] int take = 30,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var list = await _svc.GetHistoryAsync(userId.Value, take, cancellationToken);
        return Ok(list);
    }

    [HttpGet("performance")]
    [ProducesResponseType(typeof(DriverPerformanceDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DriverPerformanceDto>> Performance(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        return Ok(await _svc.GetPerformanceAsync(userId.Value, cancellationToken));
    }

    [HttpGet("notifications")]
    [ProducesResponseType(typeof(IReadOnlyList<DriverNotificationRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DriverNotificationRowDto>>> Notifications(
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var list = await _svc.GetNotificationsAsync(userId.Value, take, cancellationToken);
        return Ok(list);
    }
}
