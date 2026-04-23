using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = "Admin")]
public sealed class AdminSettingsController : ControllerBase
{
    private readonly IAdminSettingsService _svc;

    public AdminSettingsController(IAdminSettingsService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminSettingItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminSettingItemDto>>> List(CancellationToken cancellationToken)
    {
        var list = await _svc.ListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPut]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upsert([FromBody] AdminSettingUpsertRequest body, CancellationToken cancellationToken)
    {
        var err = await _svc.UpsertAsync(body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
