using FoodDelivery.Application.SiteContent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/public")]
public sealed class PublicSiteContentController : ControllerBase
{
    private readonly IPublicSiteContentService _site;
    private readonly IPublicLandingService _landing;

    public PublicSiteContentController(IPublicSiteContentService site, IPublicLandingService landing)
    {
        _site = site;
        _landing = landing;
    }

    [HttpGet("site-content")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PublicLandingContentDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicLandingContentDto>> Landing(CancellationToken cancellationToken)
    {
        var dto = await _site.GetLandingAsync(cancellationToken);
        return Ok(dto);
    }

    [HttpGet("landing-data")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PublicLandingDataDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicLandingDataDto>> LandingData(CancellationToken cancellationToken)
    {
        return Ok(await _landing.GetLandingDataAsync(cancellationToken));
    }
}
