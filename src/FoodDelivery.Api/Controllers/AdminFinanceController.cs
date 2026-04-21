using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/finance/payments")]
[Authorize(Roles = "Admin")]
public sealed class AdminFinanceController : ControllerBase
{
    private readonly IAdminFinanceService _svc;

    public AdminFinanceController(IAdminFinanceService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminPaymentListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminPaymentListResultDto>> List(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListPaymentsAsync(page, pageSize, fromUtc, toUtc, cancellationToken);
        return Ok(result);
    }
}
