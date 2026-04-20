using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/restaurants")]
[Authorize(Roles = "Admin")]
public sealed class AdminRestaurantsController : ControllerBase
{
    private readonly IAdminRestaurantsService _svc;

    public AdminRestaurantsController(IAdminRestaurantsService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminRestaurantListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminRestaurantListResultDto>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, search, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Patch(long id, [FromBody] AdminRestaurantPatchRequest body, CancellationToken cancellationToken)
    {
        var err = await _svc.PatchAsync(id, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
