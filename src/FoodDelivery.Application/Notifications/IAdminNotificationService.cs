namespace FoodDelivery.Application.Notifications;

public interface IAdminNotificationService
{
    Task<IReadOnlyList<AdminNotificationRowDto>> ListAsync(
        long userId,
        int take,
        CancellationToken cancellationToken = default);

    Task<int> UnreadCountAsync(long userId, CancellationToken cancellationToken = default);

    Task<string?> MarkReadAsync(
        long userId,
        long notificationId,
        CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(long userId, CancellationToken cancellationToken = default);
}
