using FoodDelivery.Api.Security;
using FoodDelivery.Application.Restaurants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

/// <summary>Logo dhe cover banner i restorantit — vetëm stafi i lidhur.</summary>
[ApiController]
[Route("api/kitchen/branding")]
[Authorize(Roles = "RestaurantStaff")]
public sealed class KitchenBrandingController : ControllerBase
{
    private readonly IKitchenBrandingService _branding;

    public KitchenBrandingController(IKitchenBrandingService branding) => _branding = branding;

    [HttpGet]
    [ProducesResponseType(typeof(KitchenBrandingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBranding(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var dto = await _branding.GetBrandingAsync(userId.Value, cancellationToken);
        if (dto is null)
            return NotFound(new { message = "Nuk je i lidhur me asnjë restorant." });
        return Ok(dto);
    }

    [HttpPost("logo")]
    [RequestSizeLimit(2_097_152)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2_097_152)]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadLogo(IFormFile? file, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Zgjidh një logo." });

        await using var stream = file.OpenReadStream();
        var err = await _branding.SetLogoAsync(
            userId.Value,
            stream,
            file.FileName,
            file.ContentType ?? "application/octet-stream",
            file.Length,
            cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpPost("cover")]
    [RequestSizeLimit(5_242_880)]
    [RequestFormLimits(MultipartBodyLengthLimit = 5_242_880)]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadCover(IFormFile? file, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Zgjidh një cover banner." });

        await using var stream = file.OpenReadStream();
        var err = await _branding.SetCoverAsync(
            userId.Value,
            stream,
            file.FileName,
            file.ContentType ?? "application/octet-stream",
            file.Length,
            cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpDelete("logo")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteLogo(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _branding.ClearLogoAsync(userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpDelete("cover")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteCover(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _branding.ClearCoverAsync(userId.Value, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }
}
