using FoodDelivery.Api.Security;
using FoodDelivery.Application.Support;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/support/tickets")]
[Authorize(Roles = "Customer,Driver,RestaurantStaff")]
public sealed class SupportTicketsController : ControllerBase
{
    private readonly ISupportTicketService _svc;

    public SupportTicketsController(ISupportTicketService svc)
    {
        _svc = svc;
    }

    [HttpGet("my")]
    [ProducesResponseType(typeof(IReadOnlyList<SupportTicketMineItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SupportTicketMineItemDto>>> MyList(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var list = await _svc.ListMineAsync(userId.Value, cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SupportTicketCreatedDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupportTicketCreatedDto>> Create(
        [FromBody] CreateSupportTicketRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var (id, err) = await _svc.CreateAsync(userId.Value, body, cancellationToken);
        if (id is null)
            return BadRequest(new { message = err });

        return Created(string.Empty, new SupportTicketCreatedDto(id.Value));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(SupportTicketThreadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketThreadDto>> GetThread(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var thread = await _svc.GetThreadAsync(userId.Value, id, cancellationToken);
        if (thread is null)
            return NotFound();

        return Ok(thread);
    }

    [HttpPost("{id:long}/messages")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PostMessage(
        long id,
        [FromBody] PostSupportTicketMessageRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var err = await _svc.PostCustomerMessageAsync(userId.Value, id, body.Body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
