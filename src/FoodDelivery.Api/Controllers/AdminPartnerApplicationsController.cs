using FoodDelivery.Api.Security;
using FoodDelivery.Application.Partners;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/partner-applications")]
[Authorize(Roles = "Admin")]
public sealed class AdminPartnerApplicationsController : ControllerBase
{
    private readonly IAdminPartnerApplicationService _admin;

    public AdminPartnerApplicationsController(IAdminPartnerApplicationService admin)
    {
        _admin = admin;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PartnerApplicationListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PartnerApplicationListItemDto>>> List(
        CancellationToken cancellationToken)
    {
        var list = await _admin.ListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(PartnerApplicationDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartnerApplicationDetailDto>> Get(long id, CancellationToken cancellationToken)
    {
        var detail = await _admin.GetDetailAsync(id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost("{id:long}/contact")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkContacted(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        var err = await _admin.MarkContactedAsync(id, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpPost("{id:long}/contract")]
    [ProducesResponseType(typeof(PartnerContractDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<ActionResult<PartnerContractDocumentDto>> UploadContract(
        long id,
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Zgjidh një skedar PDF." });

        await using var stream = file.OpenReadStream();
        var (contract, err) = await _admin.UploadContractAsync(
            id,
            file.FileName,
            stream,
            file.Length,
            userId.Value,
            cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return Ok(contract);
    }

    [HttpGet("{id:long}/contract")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadContract(long id, CancellationToken cancellationToken)
    {
        var (path, contentType, err) = await _admin.GetContractFileAsync(id, cancellationToken);
        if (err is not null || path is null)
            return NotFound(new { message = err ?? "Kontrata nuk u gjet." });

        var file = await _admin.GetDetailAsync(id, cancellationToken);
        var downloadName = file?.Contract?.Filename ?? "kontrata-partner.pdf";
        return PhysicalFile(path, contentType ?? "application/pdf", downloadName);
    }

    [HttpPost("{id:long}/approve")]
    [ProducesResponseType(typeof(ApprovePartnerApplicationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApprovePartnerApplicationResultDto>> Approve(
        long id,
        [FromBody] ApprovePartnerApplicationRequest? body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        var req = body ?? new ApprovePartnerApplicationRequest(null);
        var (result, err) = await _admin.ApproveAsync(id, req, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return Ok(result);
    }

    [HttpPost("{id:long}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reject(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        var err = await _admin.RejectAsync(id, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpPost("{id:long}/reset-staff-password")]
    [ProducesResponseType(typeof(ResetPartnerStaffPasswordResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ResetPartnerStaffPasswordResultDto>> ResetStaffPassword(
        long id,
        [FromBody] ResetPartnerStaffPasswordRequest? body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();
        var req = body ?? new ResetPartnerStaffPasswordRequest(null);
        var (result, err) = await _admin.ResetStaffPasswordAsync(id, req, userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return Ok(result);
    }
}
