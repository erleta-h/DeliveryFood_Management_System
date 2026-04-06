using FoodDelivery.Api.Security;
using FoodDelivery.Application.Restaurants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/kitchen/menu")]
[Authorize(Roles = "RestaurantStaff")]
public sealed class KitchenMenuController : ControllerBase
{
    private readonly IKitchenMenuService _menu;

    public KitchenMenuController(IKitchenMenuService menu)
    {
        _menu = menu;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RestaurantMenuCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RestaurantMenuCategoryDto>>> List(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var list = await _menu.GetMenuForStaffAsync(userId.Value, cancellationToken);
        return Ok(list);
    }

    [HttpPost("categories")]
    [ProducesResponseType(typeof(long), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory(
        [FromBody] KitchenMenuCreateCategoryRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (id, err) = await _menu.CreateCategoryAsync(userId.Value, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return Created($"/api/kitchen/menu/categories/{id}", id);
    }

    [HttpPatch("categories/{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateCategory(
        long id,
        [FromBody] KitchenMenuUpdateCategoryRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _menu.UpdateCategoryAsync(userId.Value, id, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpDelete("categories/{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteCategory(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _menu.DeleteCategoryAsync(userId.Value, id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpPost("items")]
    [ProducesResponseType(typeof(long), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateItem(
        [FromBody] KitchenMenuCreateItemRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (itemId, err) = await _menu.CreateItemAsync(userId.Value, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return Created($"/api/kitchen/menu/items/{itemId}", itemId);
    }

    [HttpPatch("items/{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateItem(
        long id,
        [FromBody] KitchenMenuUpdateItemRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _menu.UpdateItemAsync(userId.Value, id, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpDelete("items/{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteItem(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _menu.DeleteItemAsync(userId.Value, id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }
}
