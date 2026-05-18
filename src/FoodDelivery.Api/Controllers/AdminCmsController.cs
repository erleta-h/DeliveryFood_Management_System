using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/cms")]
[Authorize(Policy = PermissionPolicyNames.AdminCms)]
public sealed class AdminCmsController : ControllerBase
{
    private readonly IAdminCmsService _svc;

    public AdminCmsController(IAdminCmsService svc) => _svc = svc;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminCmsEntryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminCmsEntryDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await _svc.ListAsync(cancellationToken));
    }

    public sealed record UpsertBody(string Key, string? Value, string? Description);

    [HttpPut]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upsert([FromBody] UpsertBody body, CancellationToken cancellationToken)
    {
        var err = await _svc.UpsertAsync(body.Key, body.Value, body.Description, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }
}
