using FoodDelivery.Api.Security;
using FoodDelivery.Application.Security;
using FoodDelivery.Application.Support;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/support")]
[Authorize(Policy = PermissionPolicyNames.AdminSupport)]
public sealed class AdminSupportAgentsController : ControllerBase
{
    private readonly IAdminSupportTicketService _svc;

    public AdminSupportAgentsController(IAdminSupportTicketService svc)
    {
        _svc = svc;
    }

    [HttpGet("agents")]
    [ProducesResponseType(typeof(IReadOnlyList<SupportAgentDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SupportAgentDto>>> ListAgents(CancellationToken cancellationToken)
    {
        var list = await _svc.ListAgentsAsync(cancellationToken);
        return Ok(list);
    }
}
