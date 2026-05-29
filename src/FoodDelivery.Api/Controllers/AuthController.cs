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
        return FromAuthResult(result, setRefreshCookie: true);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.LoginAsync(request, cancellationToken);
        return FromAuthResult(result, setRefreshCookie: true);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        var plain = AuthCookieHelper.ReadRefreshCookie(Request);
        if (string.IsNullOrWhiteSpace(plain))
            return Unauthorized(new { error = "Sesioni ka skaduar. Hyr përsëri.", code = AuthErrorCode.InvalidRefreshToken });

        var result = await _auth.RefreshAsync(plain, cancellationToken);
        return FromAuthResult(result, setRefreshCookie: true);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var plain = AuthCookieHelper.ReadRefreshCookie(Request);
        await _auth.LogoutAsync(plain, cancellationToken);
        AuthCookieHelper.DeleteRefreshCookie(Response, Request);
        return NoContent();
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
        if (error is not null)
            return BadRequest(new { error });

        AuthCookieHelper.DeleteRefreshCookie(Response, Request);
        return NoContent();
    }

    private IActionResult FromAuthResult(AuthResult result, bool setRefreshCookie)
    {
        if (result.Success && result.Data is not null)
        {
            if (setRefreshCookie && !string.IsNullOrEmpty(result.RefreshTokenPlain))
                AuthCookieHelper.SetRefreshCookie(Response, Request, result.RefreshTokenPlain, result.Data.RefreshExpiresAtUtc);

            return Ok(new
            {
                token = result.Data.Token,
                expiresAtUtc = result.Data.ExpiresAtUtc,
                refreshExpiresAtUtc = result.Data.RefreshExpiresAtUtc,
                user = result.Data.User,
            });
        }

        var payload = new { error = result.Error, code = result.Code };
        return result.Code switch
        {
            AuthErrorCode.DuplicateEmail => Conflict(payload),
            AuthErrorCode.InvalidCredentials => Unauthorized(payload),
            AuthErrorCode.InvalidRefreshToken => Unauthorized(payload),
            AuthErrorCode.InactiveUser => StatusCode(StatusCodes.Status403Forbidden, payload),
            AuthErrorCode.RoleMissing => StatusCode(StatusCodes.Status503ServiceUnavailable, payload),
            _ => BadRequest(payload),
        };
    }
}
