using FoodDelivery.Api.Security;
using FoodDelivery.Application.Security;
using FoodDelivery.Application.Support;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/support/tickets")]
[Authorize(Policy = PermissionPolicyNames.AdminSupport)]
public sealed class AdminSupportTicketsController : ControllerBase
{
    private readonly IAdminSupportTicketService _svc;

    public AdminSupportTicketsController(IAdminSupportTicketService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminSupportTicketListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminSupportTicketListResultDto>> List(
        [FromQuery] string? search,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, search, sort, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(
        long id,
        [FromBody] AdminUpdateSupportTicketRequest body,
        CancellationToken cancellationToken)
    {
        var err = await _svc.UpdateAsync(id, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(SupportTicketThreadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketThreadDto>> GetThread(long id, CancellationToken cancellationToken)
    {
        var thread = await _svc.GetThreadAsync(id, cancellationToken);
        if (thread is null)
            return NotFound();

        return Ok(thread);
    }

    [HttpPost("{id:long}/messages")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PostStaffMessage(
        long id,
        [FromBody] PostSupportTicketMessageRequest body,
        CancellationToken cancellationToken)
    {
        var staffId = User.GetUserId();
        if (staffId is null)
            return Unauthorized();

        var err = await _svc.PostStaffReplyAsync(staffId.Value, id, body.Body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
