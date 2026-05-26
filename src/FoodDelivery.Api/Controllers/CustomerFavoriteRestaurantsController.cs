using FoodDelivery.Api.Security;
using FoodDelivery.Application.Favorites;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/customer/favorite-restaurants")]
[Authorize(Roles = "Customer")]
public sealed class CustomerFavoriteRestaurantsController : ControllerBase
{
    private readonly IFavoriteRestaurantsService _svc;

    public CustomerFavoriteRestaurantsController(IFavoriteRestaurantsService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [ProducesResponseType(typeof(FavoriteRestaurantIdsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FavoriteRestaurantIdsResponse>> List(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var ids = await _svc.GetRestaurantIdsAsync(userId.Value, cancellationToken);
        return Ok(new FavoriteRestaurantIdsResponse(ids));
    }

    [HttpGet("{restaurantId:long}")]
    [ProducesResponseType(typeof(FavoriteRestaurantToggleResult), StatusCodes.Status200OK)]
    public async Task<ActionResult<FavoriteRestaurantToggleResult>> Check(
        long restaurantId,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var isFav = await _svc.IsFavoriteAsync(userId.Value, restaurantId, cancellationToken);
        return Ok(new FavoriteRestaurantToggleResult(isFav));
    }

    [HttpPost("{restaurantId:long}/toggle")]
    [ProducesResponseType(typeof(FavoriteRestaurantToggleResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FavoriteRestaurantToggleResult>> Toggle(
        long restaurantId,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        try
        {
            var result = await _svc.ToggleAsync(userId.Value, restaurantId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
