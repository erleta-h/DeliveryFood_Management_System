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

    /// <summary>Emri i restorantit për header të panelit; <c>isLinked: false</c> nëse llogaria nuk ka rresht RestaurantStaff.</summary>
    [HttpGet("context")]
    [ProducesResponseType(typeof(KitchenStaffContextResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<KitchenStaffContextResponse>> Context(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var ctx = await _kitchen.GetKitchenContextAsync(userId.Value, cancellationToken);
        return Ok(ctx);
    }

    /// <summary>Statistika ditore (UTC): numri porosive, të përfunduara, të ardhurat (jo-anuluar).</summary>
    [HttpGet("stats/today")]
    [ProducesResponseType(typeof(KitchenTodayStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<KitchenTodayStatsDto>> TodayStats(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var stats = await _kitchen.GetTodayStatsAsync(userId.Value, cancellationToken);
        return Ok(stats);
    }

    /// <summary>Porositë për restorantin ku je i lidhur si staf (telefon + adresë klienti).</summary>
    [HttpGet("orders")]
    [ProducesResponseType(typeof(IReadOnlyList<KitchenOrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<KitchenOrderDto>>> Orders(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var list = await _kitchen.GetOrdersForMyRestaurantAsync(userId.Value, cancellationToken);
        return Ok(list);
    }

    /// <summary>Historik porosish të përfunduara / anuluara (faqezim).</summary>
    [HttpGet("orders/history")]
    [ProducesResponseType(typeof(KitchenOrderHistoryResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<KitchenOrderHistoryResultDto>> OrderHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _kitchen.GetOrderHistoryAsync(userId.Value, page, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>Përdoruesit Deliver të aktivizuar në platformë (roli Driver).</summary>
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

    /// <param name="ImmediateHandoff">null/true: menjëherë në marrje (default). false: detyrë «shko te restoranti» pa pranim manual.</param>
    public sealed record AssignKitchenDeliveryDriverRequest(long DriverUserId, bool? ImmediateHandoff = null);

    /// <summary>Cakton Deliver për porosi dërgesë «gati për marrje» (Wolt-style).</summary>
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

        var immediateHandoff = body.ImmediateHandoff ?? true;
        var err = await _kitchen.AssignDeliveryDriverAsync(
            userId.Value,
            id,
            body.DriverUserId,
            immediateHandoff,
            cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    public sealed record UpdateKitchenOrderPrepMinutesRequest(int PrepMinutes);

    /// <summary>Përditëson minutat e vlerësuara të përgatitjes (derisa porosia është në kuzhinë).</summary>
    [HttpPatch("orders/{id:long}/prep-minutes")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdatePrepMinutes(
        long id,
        [FromBody] UpdateKitchenOrderPrepMinutesRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _kitchen.UpdateOrderPrepMinutesAsync(userId.Value, id, body.PrepMinutes, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    /// <summary>Kalim statusi nga stafi i restorantit (pranuar → përgatitje → gati për driver, ose anulim).</summary>
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
