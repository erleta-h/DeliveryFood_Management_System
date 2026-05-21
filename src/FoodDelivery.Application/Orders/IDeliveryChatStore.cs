namespace FoodDelivery.Application.Orders;

/// <summary>Mesazhe chat dërgese — ruajtura në MongoDB (NoSQL).</summary>
public sealed record DeliveryChatMessageRecord(
    long Id,
    long OrderId,
    long SenderUserId,
    string Body,
    DateTime CreatedAtUtc);

public interface IDeliveryChatStore
{
    Task<IReadOnlyList<DeliveryChatMessageRecord>> GetByOrderIdAsync(
        long orderId,
        CancellationToken cancellationToken = default);

    Task<DeliveryChatMessageRecord> InsertAsync(
        long orderId,
        long senderUserId,
        string body,
        CancellationToken cancellationToken = default);
}
