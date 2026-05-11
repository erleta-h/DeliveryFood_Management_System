using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/reports")]
[Authorize(Policy = PermissionPolicyNames.AdminReports)]
public sealed class AdminReportsController : ControllerBase
{
    private readonly IAdminReportsService _svc;

    public AdminReportsController(IAdminReportsService svc) => _svc = svc;

    [HttpGet("operations")]
    [ProducesResponseType(typeof(OperationsReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OperationsReportDto>> Operations(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        CancellationToken cancellationToken = default)
    {
        var r = await _svc.GetOperationsReportAsync(fromUtc, toUtc, cancellationToken);
        return Ok(r);
    }

    [HttpGet("operations/export")]
    public async Task<IActionResult> ExportOperations(
        [FromQuery] string format = "csv",
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        CancellationToken cancellationToken = default)
    {
        var (bytes, contentType, fileName) =
            await _svc.ExportOperationsReportAsync(format, fromUtc, toUtc, cancellationToken);
        return File(bytes, contentType, fileName);
    }
}
