using FoodDelivery.Application.Partners;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/partner")]
public class PartnerController : ControllerBase
{
    private readonly IPartnerApplicationService _partner;

    public PartnerController(IPartnerApplicationService partner)
    {
        _partner = partner;
    }

    [HttpPost("applications")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitApplication(
        [FromBody] SubmitPartnerApplicationRequest request,
        CancellationToken cancellationToken)
    {
        var err = await _partner.SubmitAsync(request, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
