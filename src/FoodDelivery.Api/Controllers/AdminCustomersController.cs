using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/customers")]
[Authorize(Roles = "Admin")]
public sealed class AdminCustomersController : ControllerBase
{
    private readonly IAdminCustomersService _svc;

    public AdminCustomersController(IAdminCustomersService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminCustomerListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminCustomerListResultDto>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, search, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:long}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetActive(long id, [FromBody] AdminCustomerSetActiveRequest body, CancellationToken cancellationToken)
    {
        var err = await _svc.SetActiveAsync(id, body.IsActive, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
