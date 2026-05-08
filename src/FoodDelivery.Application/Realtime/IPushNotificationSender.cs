namespace FoodDelivery.Application.Realtime;

public interface IPushNotificationSender
{
    Task SendToUserAsync(long userId, string title, string body, CancellationToken cancellationToken = default);
}
