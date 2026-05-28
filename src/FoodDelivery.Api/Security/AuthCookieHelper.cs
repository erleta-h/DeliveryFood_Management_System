using FoodDelivery.Application.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Security;

public static class AuthCookieHelper
{
    public static void SetRefreshCookie(HttpResponse response, HttpRequest request, string plainToken, DateTime expiresUtc)
    {
        response.Cookies.Append(AuthCookieNames.RefreshToken, plainToken, BuildOptions(request, expiresUtc));
    }

    public static void DeleteRefreshCookie(HttpResponse response, HttpRequest request)
    {
        response.Cookies.Delete(AuthCookieNames.RefreshToken, new CookieOptions
        {
            Path = "/api/auth",
            Secure = request.IsHttps,
            SameSite = SameSiteMode.Lax,
        });
    }

    public static string? ReadRefreshCookie(HttpRequest request) =>
        request.Cookies.TryGetValue(AuthCookieNames.RefreshToken, out var v) ? v : null;

    private static CookieOptions BuildOptions(HttpRequest request, DateTime expiresUtc) =>
        new()
        {
            HttpOnly = true,
            Secure = request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = new DateTimeOffset(expiresUtc),
        };
}
