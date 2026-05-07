namespace FoodDelivery.Application.Realtime;

public interface IWebPushSubscriptionService
{

    Task<string?> RegisterAsync(long userId, WebPushSubscribeRequest request, CancellationToken cancellationToken = default);
}
