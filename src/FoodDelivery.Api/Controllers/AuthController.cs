using FoodDelivery.Api.Security;
using FoodDelivery.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterCustomerRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.RegisterCustomerAsync(request, cancellationToken);
        return FromAuthResult(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.LoginAsync(request, cancellationToken);
        return FromAuthResult(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var profile = await _auth.GetProfileAsync(userId.Value, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateCustomerProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var (user, validationError) = await _auth.UpdateProfileAsync(userId.Value, request, cancellationToken);
        if (validationError is not null)
            return BadRequest(new { error = validationError });
        if (user is null)
            return NotFound();
        return Ok(user);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var error = await _auth.ChangePasswordAsync(userId.Value, request, cancellationToken);
        return error is null ? NoContent() : BadRequest(new { error });
    }

    private IActionResult FromAuthResult(AuthResult result)
    {
        if (result.Success)
            return Ok(result.Data);

        var payload = new { error = result.Error, code = result.Code };
        return result.Code switch
        {
            AuthErrorCode.DuplicateEmail => Conflict(payload),
            AuthErrorCode.InvalidCredentials => Unauthorized(payload),
            AuthErrorCode.InactiveUser => StatusCode(StatusCodes.Status403Forbidden, payload),
            AuthErrorCode.RoleMissing => StatusCode(StatusCodes.Status503ServiceUnavailable, payload),
            _ => BadRequest(payload),
        };
    }
}
