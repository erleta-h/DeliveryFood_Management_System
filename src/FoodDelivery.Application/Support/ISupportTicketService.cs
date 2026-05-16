namespace FoodDelivery.Application.Support;

public interface ISupportTicketService
{
    Task<(long? Id, string? Error)> CreateAsync(
        long userId,
        CreateSupportTicketRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportTicketMineItemDto>> ListMineAsync(
        long userId,
        CancellationToken cancellationToken = default);

    Task<SupportTicketThreadDto?> GetThreadAsync(
        long userId,
        long ticketId,
        CancellationToken cancellationToken = default);

    Task<string?> PostCustomerMessageAsync(
        long userId,
        long ticketId,
        string body,
        CancellationToken cancellationToken = default);
}
