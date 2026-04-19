using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/coupons")]
[Authorize(Roles = "Admin")]
public sealed class AdminCouponsController : ControllerBase
{
    private readonly IAdminCouponsService _svc;

    public AdminCouponsController(IAdminCouponsService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminCouponListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminCouponListResultDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] AdminCouponCreateRequest body, CancellationToken cancellationToken)
    {
        var (ok, id, error) = await _svc.CreateAsync(body, cancellationToken);
        if (!ok)
            return BadRequest(new { message = error });

        return StatusCode(StatusCodes.Status201Created, new { id });
    }

    [HttpPatch("{id:long}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetActive(long id, [FromBody] AdminCouponSetActiveRequest body, CancellationToken cancellationToken)
    {
        var err = await _svc.SetActiveAsync(id, body.IsActive, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
