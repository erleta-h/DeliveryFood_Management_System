using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Realtime;

public sealed class WebPushSubscriptionService : IWebPushSubscriptionService
{
    private readonly IUnitOfWork _uow;

    public WebPushSubscriptionService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<string?> RegisterAsync(long userId, WebPushSubscribeRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Endpoint)
            || string.IsNullOrWhiteSpace(request.P256dh)
            || string.IsNullOrWhiteSpace(request.Auth))
            return "Të dhënat e abonimit janë të paplota.";

        var ep = request.Endpoint.Trim();
        if (ep.Length > 2048)
            return "Endpoint i pavlefshëm.";

        var repo = _uow.Repository<WebPushSubscription, long>();
        var existing = await repo.Query.Where(x => x.Endpoint == ep).ToListAsync(cancellationToken);
        foreach (var row in existing)
            repo.Remove(row);

        repo.Add(new WebPushSubscription
        {
            UserId = userId,
            Endpoint = ep,
            P256dh = request.P256dh.Trim(),
            Auth = request.Auth.Trim(),
            CreatedAt = DateTime.UtcNow,
        });

        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }
}
