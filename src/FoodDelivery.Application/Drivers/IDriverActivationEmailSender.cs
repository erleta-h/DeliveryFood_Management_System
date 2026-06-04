namespace FoodDelivery.Application.Drivers;

public interface IDriverActivationEmailSender
{
    Task SendActivationEmailAsync(
        string toEmail,
        string driverFullName,
        string activationUrl,
        CancellationToken cancellationToken = default);
}
