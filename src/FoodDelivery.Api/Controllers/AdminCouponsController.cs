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

    [HttpGet("stats")]
    [ProducesResponseType(typeof(AdminCouponStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminCouponStatsDto>> Stats(CancellationToken cancellationToken)
    {
        return Ok(await _svc.GetStatsAsync(cancellationToken));
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminCouponListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminCouponListResultDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sort = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, search, status, sort, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(AdminCouponDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminCouponDetailDto>> GetOne(long id, CancellationToken cancellationToken)
    {
        var detail = await _svc.GetByIdAsync(id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
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
