using FoodDelivery.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/reviews")]
[Authorize(Roles = "Admin")]
public sealed class AdminReviewsController : ControllerBase
{
    private readonly IAdminReviewsService _svc;

    public AdminReviewsController(IAdminReviewsService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminReviewListResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminReviewListResultDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _svc.ListAsync(page, pageSize, cancellationToken);
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
