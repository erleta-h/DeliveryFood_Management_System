using FoodDelivery.Application.Admin;
using FoodDelivery.Api.Security;
using FoodDelivery.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/admin/food-categories")]
[Authorize(Policy = PermissionPolicyNames.AdminFoodCategories)]
public sealed class AdminFoodCategoriesController : ControllerBase
{
    private readonly IAdminFoodCategoriesService _svc;

    public AdminFoodCategoriesController(IAdminFoodCategoriesService svc) => _svc = svc;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminFoodCategoryRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminFoodCategoryRowDto>>> List(CancellationToken cancellationToken)
    {
        var list = await _svc.ListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] AdminFoodCategoryCreateRequest body, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var (ok, id, error) = await _svc.CreateAsync(userId.Value, body, cancellationToken);
        if (!ok)
            return BadRequest(new { message = error });

        return StatusCode(StatusCodes.Status201Created, new { id });
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Update(long id, [FromBody] AdminFoodCategoryUpdateRequest body, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var err = await _svc.UpdateAsync(userId.Value, id, body, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var err = await _svc.DeleteAsync(id, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }
}
