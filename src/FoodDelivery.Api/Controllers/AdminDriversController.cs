using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/drivers")]
[Authorize(Roles = "Admin")]
public sealed class AdminDriversController : ControllerBase
{
    private readonly IAdminDriversService _svc;

    public AdminDriversController(IAdminDriversService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminDriverListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminDriverListResultDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{userId:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Patch(long userId, [FromBody] AdminDriverPatchRequest body, CancellationToken cancellationToken)
    {
        var err = await _svc.PatchAsync(userId, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
