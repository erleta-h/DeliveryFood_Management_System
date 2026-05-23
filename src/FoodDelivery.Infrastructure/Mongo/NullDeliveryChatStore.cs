using FoodDelivery.Application.Orders;

namespace FoodDelivery.Infrastructure.Mongo;

/// <summary>Fallback kur Mongo nuk është i disponueshëm — admin/SQL vazhdon të funksionojë.</summary>
public sealed class NullDeliveryChatStore : IDeliveryChatStore
{
    public Task<IReadOnlyList<DeliveryChatMessageRecord>> GetByOrderIdAsync(
        long orderId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<DeliveryChatMessageRecord>>(Array.Empty<DeliveryChatMessageRecord>());

    public Task<DeliveryChatMessageRecord> InsertAsync(
        long orderId,
        long senderUserId,
        string body,
        CancellationToken cancellationToken = default) =>
        Task.FromException<DeliveryChatMessageRecord>(
            new InvalidOperationException(
                "Chat dërgese kërkon MongoDB. Nis MongoDB ose konfiguro Mongo__ConnectionString në .env."));
}
