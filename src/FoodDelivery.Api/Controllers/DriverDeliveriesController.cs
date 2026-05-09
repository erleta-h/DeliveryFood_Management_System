using FoodDelivery.Application.Drivers;
using FoodDelivery.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/driver")]
[Authorize(Roles = "Driver")]
public sealed class DriverDeliveriesController : ControllerBase
{
    private readonly IDriverDeliveryService _svc;

    public DriverDeliveriesController(IDriverDeliveryService svc)
    {
        _svc = svc;
    }

    [HttpGet("deliveries")]
    [ProducesResponseType(typeof(IReadOnlyList<DriverDeliveryRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DriverDeliveryRowDto>>> MyDeliveries(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var list = await _svc.GetMyActiveDeliveriesAsync(userId.Value, cancellationToken);
        return Ok(list);
    }

    [HttpGet("orders/{orderId:long}")]
    [ProducesResponseType(typeof(DriverActiveOrderDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DriverActiveOrderDetailDto>> OrderDetail(
        long orderId,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var dto = await _svc.GetActiveOrderDetailAsync(userId.Value, orderId, cancellationToken);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("orders/{orderId:long}/accept-offer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AcceptOffer(long orderId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _svc.AcceptOfferAsync(userId.Value, orderId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("orders/{orderId:long}/decline-offer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeclineOffer(long orderId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _svc.DeclineOfferAsync(userId.Value, orderId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("orders/{orderId:long}/arrived-restaurant")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ArrivedRestaurant(long orderId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _svc.MarkArrivedAtRestaurantAsync(userId.Value, orderId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("orders/{orderId:long}/pickup")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Pickup(long orderId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _svc.MarkPickedUpAsync(userId.Value, orderId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("orders/{orderId:long}/delivered")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Delivered(long orderId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _svc.MarkDeliveredAsync(userId.Value, orderId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
