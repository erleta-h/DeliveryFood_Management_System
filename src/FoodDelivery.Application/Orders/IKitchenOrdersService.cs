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

    /// <summary>Përditëson minutat e vlerësuara të përgatitjes (porosi në pritje / përgatitje).</summary>
    Task<string?> UpdateOrderPrepMinutesAsync(
        long staffUserId,
        long orderId,
        int prepMinutes,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KitchenAssignableDriverDto>> GetAssignableDriversAsync(
        long staffUserId,
        CancellationToken cancellationToken = default);

    /// <summary>Cakton (ose ndërron) Deliver për porosi dërgesë në status «gati». Krijon rresht Delivery nëse mungon.</summary>
    /// <param name="immediateHandoff">Nëse true, porosia kalon menjëherë në «në dërgesë» (si pas marrjes nga restoranti).</param>
    Task<string?> AssignDeliveryDriverAsync(
        long staffUserId,
        long orderId,
        long driverUserId,
        bool immediateHandoff,
        CancellationToken cancellationToken = default);

    /// <summary>Porosi të përfunduara / anuluara (faqezim) për restorantin e stafit.</summary>
    Task<KitchenOrderHistoryResultDto> GetOrderHistoryAsync(
        long staffUserId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}
