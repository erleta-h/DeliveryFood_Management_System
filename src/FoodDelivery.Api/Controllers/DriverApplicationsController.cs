using FoodDelivery.Application.Drivers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/driver")]
public sealed class DriverApplicationsController : ControllerBase
{
    private readonly IDriverApplicationService _svc;

    public DriverApplicationsController(IDriverApplicationService svc)
    {
        _svc = svc;
    }

    [HttpPost("applications")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Submit([FromBody] SubmitDriverApplicationRequest body, CancellationToken cancellationToken)
    {
        var err = await _svc.SubmitAsync(body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
