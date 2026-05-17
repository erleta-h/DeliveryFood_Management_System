using FoodDelivery.Api.Security;
using FoodDelivery.Application.Restaurants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

/// <summary>Menaxhimi i menysë vetëm për restorantin ku stafi është i lidhur.</summary>
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

    /// <summary>Ngarko foto për artikull (JPEG, PNG, WebP, GIF).</summary>
    [HttpPost("items/{id:long}/image")]
    [RequestSizeLimit(6_291_456)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6_291_456)]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadItemImage(
        long id,
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Zgjidh një foto." });

        await using var stream = file.OpenReadStream();
        var err = await _menu.SetItemImageAsync(
            userId.Value,
            id,
            stream,
            file.FileName,
            file.ContentType ?? "application/octet-stream",
            file.Length,
            cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }

    [HttpDelete("items/{id:long}/image")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteItemImage(long id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var err = await _menu.ClearItemImageAsync(userId.Value, id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });
        return NoContent();
    }
}
