using System.IO;
using FoodDelivery.Api.Security;
using FoodDelivery.Application.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/stripe")]
public class StripePaymentsController : ControllerBase
{
    private readonly IStripePaymentService _stripe;

    public StripePaymentsController(IStripePaymentService stripe)
    {
        _stripe = stripe;
    }

    public sealed record CreateIntentBody(long OrderId);

    [HttpPost("payment-intent")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<object>> CreatePaymentIntent(
        [FromBody] CreateIntentBody body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var (clientSecret, error) = await _stripe.CreatePaymentIntentForOrderAsync(
            userId.Value,
            body.OrderId,
            cancellationToken);
        if (error is not null)
            return BadRequest(new { message = error });

        return Ok(new { clientSecret });
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        string json;
        using (var reader = new StreamReader(Request.Body))
            json = await reader.ReadToEndAsync(cancellationToken);

        var signature = Request.Headers["Stripe-Signature"].ToString();
        if (string.IsNullOrEmpty(signature))
            return BadRequest();

        try
        {
            await _stripe.HandleWebhookAsync(json, signature, cancellationToken);
        }
        catch (StripeException)
        {
            return BadRequest();
        }
        catch (InvalidOperationException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        return Ok();
    }
}
