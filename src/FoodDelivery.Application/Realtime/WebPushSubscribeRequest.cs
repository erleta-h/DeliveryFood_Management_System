namespace FoodDelivery.Application.Realtime;

public record WebPushSubscribeRequest(string Endpoint, string P256dh, string Auth);
