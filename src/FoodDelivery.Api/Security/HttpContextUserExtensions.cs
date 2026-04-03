namespace FoodDelivery.Api.Security;

public static class HttpContextUserExtensions
{
    public static long? GetUserId(this HttpContext? httpContext) =>
        httpContext?.User.GetUserId();
}
