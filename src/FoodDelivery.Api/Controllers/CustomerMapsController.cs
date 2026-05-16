using FoodDelivery.Api.Security;
using FoodDelivery.Application.Maps;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/customer/maps")]
[Authorize(Roles = "Customer")]
public sealed class CustomerMapsController : ControllerBase
{
    private readonly ICustomerDrivingPreviewService _preview;

    public CustomerMapsController(ICustomerDrivingPreviewService preview)
    {
        _preview = preview;
    }

    /// <summary>Distanca/koha me makinë nga adresa e klientit (GPS) te restoranti — kërkon Distance Matrix në server.</summary>
    [HttpGet("driving-to-restaurant/{restaurantId:long}")]
    [ProducesResponseType(typeof(DrivingPreviewResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<DrivingPreviewResponse>> DrivingToRestaurant(
        long restaurantId,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var result = await _preview.GetDrivingToRestaurantAsync(userId.Value, restaurantId, cancellationToken);
        return Ok(result);
    }
}
