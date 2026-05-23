namespace FoodDelivery.Application.Notifications;

/// <summary>Dërgon njoftime in-app (SQL Notifications) te përdoruesit me role të caktuara.</summary>
public interface INotificationPublisher
{
    Task NotifyUsersInRolesAsync(
        IReadOnlyList<string> roleNames,
        string title,
        string message,
        string type,
        CancellationToken cancellationToken = default);
}
