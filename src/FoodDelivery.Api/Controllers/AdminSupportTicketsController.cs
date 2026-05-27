using FoodDelivery.Api.Security;
using FoodDelivery.Application.Security;
using FoodDelivery.Application.Support;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/support/tickets")]
[Authorize(Policy = PermissionPolicyNames.AdminSupport)]
public sealed class AdminSupportTicketsController : ControllerBase
{
    private readonly IAdminSupportTicketService _svc;
    private readonly ILogger<AdminSupportTicketsController> _log;

    public AdminSupportTicketsController(IAdminSupportTicketService svc, ILogger<AdminSupportTicketsController> log)
    {
        _svc = svc;
        _log = log;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminSupportTicketListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminSupportTicketListResultDto>> List(
        [FromQuery] string? search,
        [FromQuery] string? sort,
        [FromQuery] int? status,
        [FromQuery] int? category,
        [FromQuery] int? priority,
        [FromQuery] long? assignedTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, search, sort,
            status, category, priority, assignedTo, cancellationToken);
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
        try
        {
            var err = await _svc.UpdateAsync(id, body, cancellationToken);
            if (err is not null) return BadRequest(new { message = err });
            return NoContent();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Update dështoi për tiketën {TicketId}.", id);
            return StatusCode(500, new { message = "Gabim i brendshëm — provo përsëri." });
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(SupportTicketThreadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketThreadDto>> GetThread(long id, CancellationToken cancellationToken)
    {
        var thread = await _svc.GetThreadAsync(id, cancellationToken);
        return thread is null ? NotFound() : Ok(thread);
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
        if (staffId is null) return Unauthorized();
        try
        {
            var err = await _svc.PostStaffReplyAsync(staffId.Value, id, body.Body, cancellationToken);
            if (err is not null) return BadRequest(new { message = err });
            return NoContent();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "PostStaffMessage dështoi për tiketën {TicketId}.", id);
            return StatusCode(500, new { message = "Gabim i brendshëm — provo përsëri." });
        }
    }

    [HttpPatch("{id:long}/assign")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Assign(
        long id,
        [FromBody] AssignTicketRequest body,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (actorId is null) return Unauthorized();
        try
        {
            var err = await _svc.AssignAsync(id, body.AgentUserId, actorId.Value, cancellationToken);
            if (err is not null) return BadRequest(new { message = err });
            return NoContent();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Assign dështoi për tiketën {TicketId}.", id);
            return StatusCode(500, new { message = "Gabim i brendshëm — provo përsëri." });
        }
    }

    [HttpPatch("{id:long}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangeStatus(
        long id,
        [FromBody] ChangeStatusRequest body,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (actorId is null) return Unauthorized();
        try
        {
            var err = await _svc.ChangeStatusAsync(id, body.Status, actorId.Value, cancellationToken);
            if (err is not null) return BadRequest(new { message = err });
            return NoContent();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "ChangeStatus dështoi për tiketën {TicketId}.", id);
            return StatusCode(500, new { message = "Gabim i brendshëm — provo përsëri." });
        }
    }

    [HttpPatch("{id:long}/priority")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePriority(
        long id,
        [FromBody] ChangePriorityRequest body,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (actorId is null) return Unauthorized();
        try
        {
            var err = await _svc.ChangePriorityAsync(id, body.Priority, actorId.Value, cancellationToken);
            if (err is not null) return BadRequest(new { message = err });
            return NoContent();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "ChangePriority dështoi për tiketën {TicketId}.", id);
            return StatusCode(500, new { message = "Gabim i brendshëm — provo përsëri." });
        }
    }

    [HttpGet("{id:long}/audit")]
    [ProducesResponseType(typeof(IReadOnlyList<SupportTicketAuditDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SupportTicketAuditDto>>> GetAudit(
        long id, CancellationToken cancellationToken)
    {
        var trail = await _svc.GetAuditTrailAsync(id, cancellationToken);
        return Ok(trail);
    }
}
