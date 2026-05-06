namespace FoodDelivery.Application.Realtime;

// Real-time + njoftime push për përditësime porosie.
public interface IOrderRealtimeNotifier
{
    Task NotifyOrderStatusChangedAsync(
        long orderId,
        int status,
        long restaurantId,
        long customerUserId,
        string orderNumber,
        CancellationToken cancellationToken = default);

    Task NotifyRestaurantNewOrderAsync(long orderId, long restaurantId, CancellationToken cancellationToken = default);

    // Dërgon koordinata të reja te klientët në grupin <c>order-{orderId}</c> (gjurmim live).
    Task NotifyDriverLocationAsync(
        long orderId,
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default);

    // Ofertë e re dërgese për korrierin (Web Push + SignalR grup <c>driver-{userId}</c>)
    Task NotifyDriverDeliveryOfferAsync(
        long driverUserId,
        long orderId,
        string orderNumber,
        CancellationToken cancellationToken = default);

    // Kur kuzhina cakton korrierin drejtpërdrejt (pa ekran «prano ofertë»).
    Task NotifyDriverDirectDeliveryAssignedAsync(
        long driverUserId,
        long orderId,
        string orderNumber,
        CancellationToken cancellationToken = default);
}
