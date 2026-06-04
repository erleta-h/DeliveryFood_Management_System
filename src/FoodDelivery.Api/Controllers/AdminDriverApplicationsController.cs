using FoodDelivery.Api.Security;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Security;
using FoodDelivery.Infrastructure.Drivers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/driver-applications")]
[Authorize(Policy = PermissionPolicyNames.AdminDriverApplications)]
public sealed class AdminDriverApplicationsController : ControllerBase
{
    private readonly IAdminDriverApplicationService _svc;
    private readonly IWebHostEnvironment _env;

    public AdminDriverApplicationsController(IAdminDriverApplicationService svc, IWebHostEnvironment env)
    {
        _svc = svc;
        _env = env;
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(DriverApplicationStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DriverApplicationStatsDto>> Stats(CancellationToken cancellationToken)
    {
        return Ok(await _svc.GetStatsAsync(cancellationToken));
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<DriverApplicationListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DriverApplicationListItemDto>>> List(
        [FromQuery] string? search,
        [FromQuery] byte? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var query = new DriverApplicationListQuery(search, status, from, to);
        return Ok(await _svc.ListAsync(query, cancellationToken));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(DriverApplicationDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DriverApplicationDetailDto>> Get(long id, CancellationToken cancellationToken)
    {
        var detail = await _svc.GetDetailAsync(id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpGet("{id:long}/documents/{kind}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadDocument(long id, string kind, CancellationToken cancellationToken)
    {
        var (path, contentType, err) = await _svc.GetDocumentFileAsync(id, kind, cancellationToken);
        if (err is not null || path is null)
            return NotFound(new { message = err ?? "Dokumenti nuk u gjet." });

        return PhysicalFile(path, contentType ?? "application/octet-stream", enableRangeProcessing: true);
    }

    [HttpPost("{id:long}/approve")]
    [ProducesResponseType(typeof(ApproveDriverApplicationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApproveDriverApplicationResultDto>> Approve(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (result, err) = await _svc.ApproveAsync(id, userId.Value, _env.IsDevelopment(), cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return Ok(result);
    }

    [HttpPost("{id:long}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reject(
        long id,
        [FromBody] RejectDriverApplicationRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _svc.RejectAsync(id, body, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpPost("{id:long}/resend-activation")]
    [ProducesResponseType(typeof(ResendDriverActivationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ResendDriverActivationResultDto>> ResendActivation(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (result, err) = await _svc.ResendActivationEmailAsync(id, userId.Value, _env.IsDevelopment(), cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return Ok(result);
    }
}
