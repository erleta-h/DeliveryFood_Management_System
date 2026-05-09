using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Orders;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Background;

/// <summary>Kontrollon ofertat PendingAccept që kanë skaduar dhe kalon te driver-i tjetër .</summary>
public sealed class DeliveryOfferExpiryHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly DeliveryDispatchSettings _settings;

    public DeliveryOfferExpiryHostedService(
        IServiceProvider serviceProvider,
        IOptions<DeliveryDispatchSettings> options)
    {
        _serviceProvider = serviceProvider;
        _settings = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(Math.Clamp(_settings.ExpirySweepIntervalSeconds, 2, 60));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(interval, stoppingToken);
                using var scope = _serviceProvider.CreateScope();
                var dispatch = scope.ServiceProvider.GetRequiredService<IDeliveryAutoDispatchService>();
                await dispatch.ProcessExpiredPendingOffersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch
            {
                // Mos e rrëzo API-n — rifillo apet
            }
        }
    }
}
