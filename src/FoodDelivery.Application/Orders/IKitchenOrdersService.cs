namespace FoodDelivery.Application.Orders;

public interface IKitchenOrdersService
{
    /// <summary>Informacion për restorantin ku përdoruesi është staf (ose jo i lidhur).</summary>
    Task<KitchenStaffContextResponse> GetKitchenContextAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    /// <summary>Porositë për restorantin ku përdoruesi është staf.</summary>
    Task<IReadOnlyList<KitchenOrderDto>> GetOrdersForMyRestaurantAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    Task<KitchenTodayStatsDto> GetTodayStatsAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    /// <summary>null = sukses; përndryshe mesazh për klientin API.</summary>
    Task<string?> UpdateOrderStatusAsync(
        long staffUserId,
        long orderId,
        int newStatus,
        string? note,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KitchenAssignableDriverDto>> GetAssignableDriversAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    /// <summary>null = sukses; përndryshe mesazh për klientin API.</summary>
    Task<string?> AssignDeliveryDriverAsync(
        long staffUserId,
        long orderId,
        long driverUserId,
        CancellationToken cancellationToken = default);
}
