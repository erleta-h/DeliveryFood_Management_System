using FoodDelivery.Api.Security;
using FoodDelivery.Application.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

/// <summary>Chat tekst klient ↔ korrier për një porosi (pas pranimit të dërgesës).</summary>
[ApiController]
[Route("api/orders/{orderId:long}/delivery-chat")]
[Authorize(Roles = "Customer,Driver")]
public sealed class OrderDeliveryChatController : ControllerBase
{
    private readonly IDeliveryChatService _chat;

    public OrderDeliveryChatController(IDeliveryChatService chat) => _chat = chat;

    [HttpGet("messages")]
    [ProducesResponseType(typeof(IReadOnlyList<DeliveryChatMessageDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<DeliveryChatMessageDto>>> GetMessages(
        long orderId,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (items, error) = await _chat.GetMessagesAsync(orderId, userId.Value, cancellationToken);
        if (error is not null)
            return BadRequest(new { message = error });

        return Ok(items);
    }

    [HttpPost("messages")]
    [ProducesResponseType(typeof(DeliveryChatMessageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DeliveryChatMessageDto>> PostMessage(
        long orderId,
        [FromBody] PostDeliveryChatRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var text = body.Body ?? string.Empty;
        var (msg, error) = await _chat.PostMessageAsync(orderId, userId.Value, text, cancellationToken);
        if (error is not null)
            return BadRequest(new { message = error });

        return Ok(msg);
    }

    [HttpPost("mark-seen")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkSeen(long orderId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var error = await _chat.MarkSeenAsync(orderId, userId.Value, cancellationToken);
        if (error is not null)
            return BadRequest(new { message = error });

        return NoContent();
    }
}
