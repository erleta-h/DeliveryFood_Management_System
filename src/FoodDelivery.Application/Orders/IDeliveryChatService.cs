namespace FoodDelivery.Application.Orders;

public interface IDeliveryChatService
{
    Task<(IReadOnlyList<DeliveryChatMessageDto>? Items, string? Error)> GetMessagesAsync(
        long orderId,
        long userId,
        CancellationToken cancellationToken = default);

    Task<(DeliveryChatMessageDto? Message, string? Error)> PostMessageAsync(
        long orderId,
        long userId,
        string body,
        CancellationToken cancellationToken = default);

    Task<string?> MarkSeenAsync(long orderId, long userId, CancellationToken cancellationToken = default);
}
