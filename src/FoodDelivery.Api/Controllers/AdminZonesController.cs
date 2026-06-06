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

    [HttpGet("stats")]
    [ProducesResponseType(typeof(DeliveryZoneStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DeliveryZoneStatsDto>> Stats(CancellationToken cancellationToken)
    {
        return Ok(await _svc.GetStatsAsync(cancellationToken));
    }

    [HttpGet("options")]
    [ProducesResponseType(typeof(IReadOnlyList<DeliveryZoneOptionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DeliveryZoneOptionDto>>> Options(CancellationToken cancellationToken)
    {
        return Ok(await _svc.ListOptionsAsync(cancellationToken));
    }

    [HttpGet("cities")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminCityZoneDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminCityZoneDto>>> Cities(CancellationToken cancellationToken)
    {
        var list = await _svc.ListCitySummariesAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet]
    [ProducesResponseType(typeof(DeliveryZoneListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DeliveryZoneListResultDto>> List(
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
    [ProducesResponseType(typeof(DeliveryZoneDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeliveryZoneDetailDto>> GetOne(long id, CancellationToken cancellationToken)
    {
        var detail = await _svc.GetDetailAsync(id, cancellationToken);
        if (detail is null)
            return NotFound(new { message = "Zona nuk u gjet." });
        return Ok(detail);
    }

    [HttpPost]
    [ProducesResponseType(typeof(DeliveryZoneDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DeliveryZoneDetailDto>> Create(
        [FromBody] CreateDeliveryZoneRequest body,
        CancellationToken cancellationToken)
    {
        var (result, err) = await _svc.CreateAsync(body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return CreatedAtAction(nameof(GetOne), new { id = result!.Id }, result);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType(typeof(DeliveryZoneDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeliveryZoneDetailDto>> Update(
        long id,
        [FromBody] UpdateDeliveryZoneRequest body,
        CancellationToken cancellationToken)
    {
        var (result, err) = await _svc.UpdateAsync(id, body, cancellationToken);
        if (err is not null)
        {
            if (err.Contains("nuk u gjet"))
                return NotFound(new { message = err });
            return BadRequest(new { message = err });
        }

        return Ok(result);
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var err = await _svc.DeleteAsync(id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }
}
