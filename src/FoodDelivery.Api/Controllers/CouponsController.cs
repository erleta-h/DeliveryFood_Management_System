using FoodDelivery.Application.Coupons;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/coupons")]
[Authorize(Roles = "Customer")]
public sealed class CouponsController : ControllerBase
{
    private readonly ICouponService _coupons;

    public CouponsController(ICouponService coupons)
    {
        _coupons = coupons;
    }

    [HttpPost("validate")]
    [ProducesResponseType(typeof(ValidateCouponResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ValidateCouponResponse>> Validate(
        [FromBody] ValidateCouponRequest body,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(body.Code))
            return BadRequest(new { message = "Kuponi nuk u gjet." });

        var (preview, error) = await _coupons.PreviewAsync(body.Code, body.Subtotal, cancellationToken);
        if (preview is null)
            return BadRequest(new { message = error ?? "Kuponi nuk u gjet." });

        return Ok(new ValidateCouponResponse(
            preview.CouponId,
            preview.Code,
            preview.DiscountPercent,
            preview.DiscountAmount,
            preview.DiscountedSubtotal));
    }
}
