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

    Task<(long? MessageId, string? Error)> PostCustomerMessageAsync(
        long userId,
        long ticketId,
        string body,
        CancellationToken cancellationToken = default);

    Task<(long? AttachmentId, string? Error)> AddAttachmentAsync(
        long userId,
        long ticketId,
        long? messageId,
        Stream fileStream,
        string originalFileName,
        CancellationToken cancellationToken = default);

    Task<(string? PhysicalPath, string? ContentType, string? Error)> GetAttachmentFileAsync(
        long userId,
        long ticketId,
        long attachmentId,
        bool allowPlatformStaff,
        CancellationToken cancellationToken = default);
}
