using FoodDelivery.Api.Security;
using FoodDelivery.Application.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/kitchen")]
[Authorize(Roles = "RestaurantStaff")]
public class KitchenController : ControllerBase
{
    private readonly IKitchenOrdersService _kitchen;

    public KitchenController(IKitchenOrdersService kitchen)
    {
        _kitchen = kitchen;
    }

    [HttpGet("context")]
    [ProducesResponseType(typeof(KitchenStaffContextResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<KitchenStaffContextResponse>> Context(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var ctx = await _kitchen.GetKitchenContextAsync(userId.Value, cancellationToken);
        return Ok(ctx);
    }

    [HttpGet("stats/today")]
    [ProducesResponseType(typeof(KitchenTodayStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<KitchenTodayStatsDto>> TodayStats(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var stats = await _kitchen.GetTodayStatsAsync(userId.Value, cancellationToken);
        return Ok(stats);
    }

    [HttpGet("orders")]
    [ProducesResponseType(typeof(IReadOnlyList<KitchenOrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<KitchenOrderDto>>> Orders(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var list = await _kitchen.GetOrdersForMyRestaurantAsync(userId.Value, cancellationToken);
        return Ok(list);
    }

    [HttpGet("drivers/assignable")]
    [ProducesResponseType(typeof(IReadOnlyList<KitchenAssignableDriverDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<KitchenAssignableDriverDto>>> AssignableDrivers(
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var list = await _kitchen.GetAssignableDriversAsync(userId.Value, cancellationToken);
        return Ok(list);
    }

    public sealed record AssignKitchenDeliveryDriverRequest(long DriverUserId);

    [HttpPatch("orders/{id:long}/assign-driver")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AssignDriver(
        long id,
        [FromBody] AssignKitchenDeliveryDriverRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _kitchen.AssignDeliveryDriverAsync(userId.Value, id, body.DriverUserId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPatch("orders/{id:long}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateOrderStatus(
        long id,
        [FromBody] UpdateKitchenOrderStatusRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _kitchen.UpdateOrderStatusAsync(userId.Value, id, body.Status, body.Note, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
