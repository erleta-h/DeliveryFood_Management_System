using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Public;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/public")]
public class PublicConfigController : ControllerBase
{
    [HttpGet("client-config")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ClientPublicConfigDto), StatusCodes.Status200OK)]
    public ActionResult<ClientPublicConfigDto> ClientConfig(
        [FromServices] IOptions<GoogleMapsSettings> googleMaps,
        [FromServices] IOptions<StripeSettings> stripe,
        [FromServices] IOptions<WebPushSettings> webPush)
    {
        var gm = googleMaps.Value;
        var st = stripe.Value;
        var wp = webPush.Value;
        return Ok(new ClientPublicConfigDto(
            gm.BrowserApiKey,
            st.PublishableKey,
            wp.VapidPublicKey));
    }
}
