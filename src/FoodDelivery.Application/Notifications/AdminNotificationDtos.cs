namespace FoodDelivery.Application.Notifications;

public record AdminNotificationRowDto(
    long Id,
    string Title,
    string Message,
    string Type,
    string? LinkPath,
    DateTime CreatedAtUtc,
    bool IsRead);

public record NotificationUnreadCountDto(int Count);
