using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/audit")]
[Authorize(Policy = PermissionPolicyNames.AdminAudit)]
public sealed class AdminAuditController : ControllerBase
{
    private readonly IAdminAuditService _svc;

    public AdminAuditController(IAdminAuditService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminAuditLogListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminAuditLogListResultDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 40,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, cancellationToken);
        return Ok(result);
    }
}
