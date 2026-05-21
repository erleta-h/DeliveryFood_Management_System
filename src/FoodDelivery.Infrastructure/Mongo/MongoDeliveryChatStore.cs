using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Orders;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace FoodDelivery.Infrastructure.Mongo;

public sealed class MongoDeliveryChatStore : IDeliveryChatStore
{
    private static readonly object IndexLock = new();
    private static volatile bool _indexesEnsured;

    private readonly IMongoCollection<DeliveryChatMessageDocument> _collection;

    public MongoDeliveryChatStore(IMongoDatabase database, IOptions<MongoSettings> settings)
    {
        var collectionName = settings.Value.DeliveryChatCollection;
        _collection = database.GetCollection<DeliveryChatMessageDocument>(collectionName);
    }

    public async Task<IReadOnlyList<DeliveryChatMessageRecord>> GetByOrderIdAsync(
        long orderId,
        CancellationToken cancellationToken = default)
    {
        EnsureIndexesOnce();

        var docs = await _collection
            .Find(x => x.OrderId == orderId)
            .SortBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return docs.Select(Map).ToList();
    }

    public async Task<DeliveryChatMessageRecord> InsertAsync(
        long orderId,
        long senderUserId,
        string body,
        CancellationToken cancellationToken = default)
    {
        EnsureIndexesOnce();

        var doc = new DeliveryChatMessageDocument
        {
            Id = DateTime.UtcNow.Ticks,
            OrderId = orderId,
            SenderUserId = senderUserId,
            Body = body,
            CreatedAtUtc = DateTime.UtcNow,
        };

        await _collection.InsertOneAsync(doc, cancellationToken: cancellationToken).ConfigureAwait(false);

        return Map(doc);
    }

    private void EnsureIndexesOnce()
    {
        if (_indexesEnsured)
            return;

        lock (IndexLock)
        {
            if (_indexesEnsured)
                return;

            var keys = Builders<DeliveryChatMessageDocument>.IndexKeys
                .Ascending(x => x.OrderId)
                .Ascending(x => x.CreatedAtUtc);

            _collection.Indexes.CreateOne(new CreateIndexModel<DeliveryChatMessageDocument>(keys));
            _indexesEnsured = true;
        }
    }

    private static DeliveryChatMessageRecord Map(DeliveryChatMessageDocument d) =>
        new(d.Id, d.OrderId, d.SenderUserId, d.Body, d.CreatedAtUtc);
}
