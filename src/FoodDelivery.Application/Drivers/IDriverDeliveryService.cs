namespace FoodDelivery.Application.Drivers;

public interface IDriverDeliveryService
{
    Task<DriverStatusDto> GetStatusAsync(long driverUserId, CancellationToken cancellationToken = default);

    Task<string?> SetOnlineAsync(long driverUserId, CancellationToken cancellationToken = default);

    Task<string?> SetOfflineAsync(long driverUserId, CancellationToken cancellationToken = default);

    Task PostLocationAsync(long driverUserId, double latitude, double longitude, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DriverDeliveryRowDto>> GetMyActiveDeliveriesAsync(
        long driverUserId,
        CancellationToken cancellationToken = default);

    Task<DriverActiveOrderDetailDto?> GetActiveOrderDetailAsync(
        long driverUserId,
        long orderId,
        CancellationToken cancellationToken = default);

    Task<string?> AcceptOfferAsync(long driverUserId, long orderId, CancellationToken cancellationToken = default);

    Task<string?> DeclineOfferAsync(long driverUserId, long orderId, CancellationToken cancellationToken = default);

    Task<string?> MarkArrivedAtRestaurantAsync(long driverUserId, long orderId, CancellationToken cancellationToken = default);

    Task<string?> MarkPickedUpAsync(long driverUserId, long orderId, CancellationToken cancellationToken = default);

    Task<string?> MarkDeliveredAsync(long driverUserId, long orderId, CancellationToken cancellationToken = default);

    Task<DriverEarningsDto> GetEarningsAsync(long driverUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DriverHistoryRowDto>> GetHistoryAsync(
        long driverUserId,
        int take,
        CancellationToken cancellationToken = default);

    Task<DriverPerformanceDto> GetPerformanceAsync(long driverUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DriverNotificationRowDto>> GetNotificationsAsync(
        long driverUserId,
        int take,
        CancellationToken cancellationToken = default);

    Task<DriverAccountProfileDto?> GetDriverAccountAsync(long driverUserId, CancellationToken cancellationToken = default);
}
