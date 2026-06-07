using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Security;
using FoodDelivery.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/data-port")]
[Authorize(Policy = PermissionPolicyNames.AdminDataPort)]
public sealed class AdminDataPortController : ControllerBase
{
    private readonly IAdminDataPortService _svc;

    public AdminDataPortController(IAdminDataPortService svc) => _svc = svc;

    [HttpGet("export/{resource}")]
    public async Task<IActionResult> Export(
        string resource,
        [FromQuery] string format = "csv",
        CancellationToken cancellationToken = default)
    {
        var (bytes, contentType, fileName) = await _svc.ExportAsync(resource, format, cancellationToken);
        return File(bytes, contentType, fileName);
    }

    [HttpPost("import/{resource}")]
    [RequestSizeLimit(2_000_000)]
    public async Task<IActionResult> Import(
        string resource,
        [FromQuery] string format,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var ms = new MemoryStream();
            await Request.Body.CopyToAsync(ms, cancellationToken);
            ms.Position = 0;
            var err = await _svc.ImportAsync(resource, format, ms, User.GetUserId(), cancellationToken);
            if (err is not null)
                return BadRequest(new { message = err });
            return NoContent();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
