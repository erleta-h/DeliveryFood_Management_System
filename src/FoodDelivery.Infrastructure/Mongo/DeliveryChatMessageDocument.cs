using MongoDB.Bson.Serialization.Attributes;

namespace FoodDelivery.Infrastructure.Mongo;

[BsonIgnoreExtraElements]
public sealed class DeliveryChatMessageDocument
{
    [BsonId]
    public long Id { get; set; }

    public long OrderId { get; set; }

    public long SenderUserId { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
}
