using FoodDelivery.Api.Security;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/driver-applications")]
[Authorize(Policy = PermissionPolicyNames.AdminDriverApplications)]
public sealed class AdminDriverApplicationsController : ControllerBase
{
    private readonly IAdminDriverApplicationService _svc;

    public AdminDriverApplicationsController(IAdminDriverApplicationService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<DriverApplicationListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DriverApplicationListItemDto>>> List(CancellationToken cancellationToken)
    {
        var list = await _svc.ListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost("{id:long}/approve")]
    [ProducesResponseType(typeof(ApproveDriverApplicationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApproveDriverApplicationResultDto>> Approve(
        long id,
        [FromBody] ApproveDriverApplicationRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (result, err) = await _svc.ApproveAsync(id, body, userId.Value, cancellationToken);
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
        if (userId is null) return Unauthorized();

        var err = await _svc.RejectAsync(id, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
