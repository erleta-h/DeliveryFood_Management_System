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
    [ProducesResponseType(typeof(long), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<long>> Place(
        [FromBody] PlaceOrderRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (orderId, error) = await _orders.PlaceOrderAsync(userId.Value, request, cancellationToken);
        if (orderId is null)
            return BadRequest(new { message = error });

        return CreatedAtAction(nameof(GetOne), new { id = orderId }, orderId);
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
}
