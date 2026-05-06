using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/zones")]
[Authorize(Roles = "Admin")]
public sealed class AdminZonesController : ControllerBase
{
    private readonly IAdminZonesService _svc;

    public AdminZonesController(IAdminZonesService svc)
    {
        _svc = svc;
    }

    [HttpGet("cities")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminCityZoneDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminCityZoneDto>>> Cities(CancellationToken cancellationToken)
    {
        var list = await _svc.ListCitySummariesAsync(cancellationToken);
        return Ok(list);
    }
}
