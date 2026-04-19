using FoodDelivery.Api.Security;
using FoodDelivery.Application.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin")]
public sealed class AdminOrdersController : ControllerBase
{
    private readonly IAdminOrdersService _adminOrders;

    public AdminOrdersController(IAdminOrdersService adminOrders)
    {
        _adminOrders = adminOrders;
    }

    /// <summary>Lista e porosive me filtra (datat në UTC).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(AdminOrderListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminOrderListResultDto>> List(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int? status,
        [FromQuery] long? restaurantId,
        [FromQuery] long? customerUserId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new AdminOrderListQuery(
            fromUtc,
            toUtc,
            status,
            restaurantId,
            customerUserId,
            page,
            pageSize);

        var result = await _adminOrders.ListAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:long}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateStatus(
        long id,
        [FromBody] AdminUpdateOrderStatusRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var err = await _adminOrders.UpdateStatusAsync(userId.Value, id, body.Status, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("{id:long}/cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Cancel(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var err = await _adminOrders.CancelAsync(userId.Value, id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("{id:long}/refund")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Refund(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var err = await _adminOrders.RefundAsync(userId.Value, id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
