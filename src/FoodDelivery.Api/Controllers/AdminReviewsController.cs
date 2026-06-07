using System.Security.Claims;
using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/reviews")]
[Authorize(Roles = "Admin")]
public sealed class AdminReviewsController : ControllerBase
{
    private readonly IAdminReviewsService _svc;

    public AdminReviewsController(IAdminReviewsService svc)
    {
        _svc = svc;
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(AdminReviewStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminReviewStatsDto>> Stats(CancellationToken cancellationToken)
    {
        var result = await _svc.GetStatsAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminReviewListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminReviewListResultDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 15,
        [FromQuery] string? search = null,
        [FromQuery] int? status = null,
        [FromQuery] int? subject = null,
        [FromQuery] int? rating = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        CancellationToken cancellationToken = default)
    {
        var query = new AdminReviewListQuery(page, pageSize, search, status, subject, rating, fromUtc, toUtc);
        var result = await _svc.ListAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:long}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetStatus(
        long id,
        [FromBody] AdminReviewSetStatusRequest body,
        CancellationToken cancellationToken)
    {
        var adminId = TryGetUserId();
        var err = await _svc.SetStatusAsync(id, body.Status, adminId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var err = await _svc.DeleteAsync(id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    private long? TryGetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(raw, out var id) ? id : null;
    }
}
