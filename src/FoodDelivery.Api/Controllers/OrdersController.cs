using FoodDelivery.Api.Security;
using FoodDelivery.Application.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize(Roles = "Customer")]
public class OrdersController : ControllerBase
{
    private readonly IOrdersService _orders;

    public OrdersController(IOrdersService orders)
    {
        _orders = orders;
    }

    [HttpPost]
    [ProducesResponseType(typeof(PlaceOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PlaceOrderResponse>> Place(
        [FromBody] PlaceOrderRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (response, error) = await _orders.PlaceOrderAsync(userId.Value, request, cancellationToken);
        if (response is null)
            return BadRequest(new { message = error });

        return Created($"/api/orders/my/{response.OrderId}", response);
    }

    [HttpGet("my")]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerOrderSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CustomerOrderSummaryDto>>> MyList(
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var list = await _orders.GetMyOrdersAsync(userId.Value, cancellationToken);
        return Ok(list);
    }

    [HttpGet("my/{id:long}")]
    [ProducesResponseType(typeof(CustomerOrderDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerOrderDetailDto>> GetOne(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var order = await _orders.GetMyOrderAsync(userId.Value, id, cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    /// <summary>Anulon porosinë në pritje kur pagesa me kartë nuk është kryer (refuzim nga banka / klienti).</summary>
    [HttpPost("my/{id:long}/cancel-unpaid-stripe")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelUnpaidStripe(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (ok, error) = await _orders.CancelUnpaidStripeOrderAsync(userId.Value, id, cancellationToken);
        if (!ok) return BadRequest(new { message = error });

        return NoContent();
    }

    /// <summary>Heq porosinë nga «Porositë e mia» (historia e klientit); porosia mbetet në sistem.</summary>
    [HttpDelete("my/{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> HideFromMyHistory(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var ok = await _orders.HideOrderFromCustomerHistoryAsync(userId.Value, id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }
}
