namespace FoodDelivery.Application.Orders;

public interface IKitchenOrdersService
{
    Task<KitchenStaffContextResponse> GetKitchenContextAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KitchenOrderDto>> GetOrdersForMyRestaurantAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    Task<KitchenTodayStatsDto> GetTodayStatsAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    Task<string?> UpdateOrderStatusAsync(
        long staffUserId,
        long orderId,
        int newStatus,
        string? note,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KitchenAssignableDriverDto>> GetAssignableDriversAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    Task<string?> AssignDeliveryDriverAsync(
        long staffUserId,
        long orderId,
        long driverUserId,
        CancellationToken cancellationToken = default);
}
