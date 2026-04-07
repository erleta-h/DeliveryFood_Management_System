using FoodDelivery.Application.Restaurants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/restaurants")]
public class RestaurantsController : ControllerBase
{
    private readonly IRestaurantCatalogService _catalog;

    public RestaurantsController(IRestaurantCatalogService catalog)
    {
        _catalog = catalog;
    }

   
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<RestaurantListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RestaurantListItemDto>>> Search(
        [FromQuery] string? q,
        [FromQuery] long? categoryId,
        [FromQuery] string? sort,
        CancellationToken cancellationToken)
    {
        var sortMode = ParseListSort(sort);
        var list = await _catalog.SearchAsync(q, categoryId, sortMode, cancellationToken);
        return Ok(list);
    }

    
    private static RestaurantListSort ParseListSort(string? sort) =>
        sort?.Trim().ToLowerInvariant() switch
        {
            "rating" => RestaurantListSort.Rating,
            "eta" => RestaurantListSort.EstimatedDelivery,
            "name" => RestaurantListSort.Name,
            "fee" => RestaurantListSort.DeliveryFee,
            _ => RestaurantListSort.Rating,
        };

    [HttpGet("categories")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<FoodCategoryOptionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FoodCategoryOptionDto>>> Categories(CancellationToken cancellationToken)
    {
        var list = await _catalog.GetCategoriesAsync(cancellationToken);
        return Ok(list);
    }

   
    [HttpGet("{id:long}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RestaurantSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RestaurantSummaryDto>> Summary(long id, CancellationToken cancellationToken)
    {
        var row = await _catalog.GetSummaryAsync(id, cancellationToken);
        if (row is null)
            return NotFound();
        return Ok(row);
    }

    [HttpGet("{id:long}/menu")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<RestaurantMenuCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RestaurantMenuCategoryDto>>> Menu(
        long id,
        CancellationToken cancellationToken)
    {
        var list = await _catalog.GetRestaurantMenuAsync(id, cancellationToken);
        return Ok(list);
    }
}
