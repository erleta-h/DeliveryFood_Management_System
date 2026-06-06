using FoodDelivery.Api.Security;
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

    [HttpGet("{id:long}/uses")]
    [ProducesResponseType(typeof(AdminCouponUsesResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminCouponUsesResultDto>> Uses(
        long id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListUsesAsync(id, page, pageSize, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:long}/history")]
    [ProducesResponseType(typeof(AdminCouponHistoryResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminCouponHistoryResultDto>> History(long id, CancellationToken cancellationToken)
    {
        var result = await _svc.ListHistoryAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] AdminCouponCreateRequest body, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var (ok, id, error) = await _svc.CreateAsync(body, userId, cancellationToken);
        if (!ok)
            return BadRequest(new { message = error });

        return StatusCode(StatusCodes.Status201Created, new { id });
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(long id, [FromBody] AdminCouponUpdateRequest body, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var err = await _svc.UpdateAsync(id, body, userId, cancellationToken);
        if (err == "Kupon nuk u gjet.")
            return NotFound(new { message = err });
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPatch("{id:long}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetActive(long id, [FromBody] AdminCouponSetActiveRequest body, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var err = await _svc.SetActiveAsync(id, body.IsActive, userId, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
