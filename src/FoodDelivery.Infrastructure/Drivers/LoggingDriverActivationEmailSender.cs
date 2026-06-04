using FoodDelivery.Application.Drivers;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Drivers;

public sealed class LoggingDriverActivationEmailSender : IDriverActivationEmailSender
{
    private readonly ILogger<LoggingDriverActivationEmailSender> _log;
    private readonly IHostEnvironment _env;

    public LoggingDriverActivationEmailSender(
        ILogger<LoggingDriverActivationEmailSender> log,
        IHostEnvironment env)
    {
        _log = log;
        _env = env;
    }

    public Task SendActivationEmailAsync(
        string toEmail,
        string driverFullName,
        string activationUrl,
        CancellationToken cancellationToken = default)
    {
        _log.LogInformation(
            "Driver activation email → {Email} ({Name}). Link: {Url}",
            toEmail,
            driverFullName,
            activationUrl);

        if (_env.IsDevelopment())
        {
            try
            {
                var dir = Path.Combine(_env.ContentRootPath, "App_Data", "activation-emails");
                Directory.CreateDirectory(dir);
                var file = Path.Combine(dir, $"{DateTime.UtcNow:yyyyMMddHHmmss}_{toEmail.Replace('@', '_')}.txt");
                File.WriteAllText(
                    file,
                    $"""
                    To: {toEmail}
                    Subject: Aktivizo llogarinë Deliver — FoodDelivery

                    Përshëndetje {driverFullName},

                    Aplikimi juaj është miratuar.
                    Klikoni linkun më poshtë për të aktivizuar llogarinë dhe për të krijuar fjalëkalimin:

                    {activationUrl}
                    """);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Could not write dev activation email file.");
            }
        }

        return Task.CompletedTask;
    }
}
