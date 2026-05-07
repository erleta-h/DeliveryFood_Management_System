using System.Net;
using System.Text.Json;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebPush;

namespace FoodDelivery.Infrastructure.Realtime;

public sealed class WebPushNotificationSender : IPushNotificationSender
{
    private readonly IUnitOfWork _uow;
    private readonly WebPushSettings _settings;
    private readonly ILogger<WebPushNotificationSender> _log;

    public WebPushNotificationSender(
        IUnitOfWork uow,
        IOptions<WebPushSettings> settings,
        ILogger<WebPushNotificationSender> log)
    {
        _uow = uow;
        _settings = settings.Value;
        _log = log;
    }

    public async Task SendToUserAsync(long userId, string title, string body, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.VapidPublicKey)
            || string.IsNullOrWhiteSpace(_settings.VapidPrivateKey))
            return;

        var subs = await _uow.Repository<WebPushSubscription, long>().Query
            .Where(s => s.UserId == userId)
            .ToListAsync(cancellationToken);
        if (subs.Count == 0)
            return;

        var subject = string.IsNullOrWhiteSpace(_settings.VapidSubject)
            ? "mailto:support@localhost"
            : _settings.VapidSubject.Trim();

        var vapid = new VapidDetails(subject, _settings.VapidPublicKey, _settings.VapidPrivateKey);
        var payload = JsonSerializer.Serialize(new { title, body });
        var client = new WebPushClient();

        foreach (var s in subs)
        {
            var sub = new PushSubscription(s.Endpoint, s.P256dh, s.Auth);
            try
            {
                await client.SendNotificationAsync(sub, payload, vapid);
            }
            catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                _uow.Repository<WebPushSubscription, long>().Remove(s);
                try
                {
                    await _uow.SaveChangesAsync(cancellationToken);
                }
                catch (Exception saveEx)
                {
                    _log.LogDebug(saveEx, "Heqja e abonimit të vjetër push dështoi.");
                }
            }
            catch (Exception ex)
            {
                _log.LogDebug(ex, "Dërgimi push për endpoint dështoi.");
            }
        }
    }
}
