namespace FoodDelivery.Application.Notifications;

public record CustomerNotificationRowDto(
    long Id,
    string Title,
    string Message,
    string Type,
    DateTime CreatedAtUtc,
    bool IsRead);
