using FoodDelivery.Application.SiteContent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/public")]
public sealed class PublicSiteContentController : ControllerBase
{
    private readonly IPublicSiteContentService _site;

    public PublicSiteContentController(IPublicSiteContentService site) => _site = site;

    [HttpGet("site-content")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PublicLandingContentDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicLandingContentDto>> Landing(CancellationToken cancellationToken)
    {
        var dto = await _site.GetLandingAsync(cancellationToken);
        return Ok(dto);
    }
}
