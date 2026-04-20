using FoodDelivery.Api.Security;
using FoodDelivery.Application.Partners;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/partner-applications")]
[Authorize(Roles = "Admin")]
public sealed class AdminPartnerApplicationsController : ControllerBase
{
    private readonly IAdminPartnerApplicationService _admin;

    public AdminPartnerApplicationsController(IAdminPartnerApplicationService admin)
    {
        _admin = admin;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PartnerApplicationListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PartnerApplicationListItemDto>>> List(
        CancellationToken cancellationToken)
    {
        var list = await _admin.ListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost("{id:long}/approve")]
    [ProducesResponseType(typeof(ApprovePartnerApplicationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApprovePartnerApplicationResultDto>> Approve(
        long id,
        [FromBody] ApprovePartnerApplicationRequest? body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        var req = body ?? new ApprovePartnerApplicationRequest(null);
        var (result, err) = await _admin.ApproveAsync(id, req, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return Ok(result);
    }

    [HttpPost("{id:long}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reject(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        var err = await _admin.RejectAsync(id, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpPost("{id:long}/reset-staff-password")]
    [ProducesResponseType(typeof(ResetPartnerStaffPasswordResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ResetPartnerStaffPasswordResultDto>> ResetStaffPassword(
        long id,
        [FromBody] ResetPartnerStaffPasswordRequest? body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        var req = body ?? new ResetPartnerStaffPasswordRequest(null);
        var (result, err) = await _admin.ResetStaffPasswordAsync(id, req, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return Ok(result);
    }
}
