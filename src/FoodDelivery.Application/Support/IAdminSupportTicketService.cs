namespace FoodDelivery.Application.Support;

public interface IAdminSupportTicketService
{
    Task<AdminSupportTicketListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? sort,
        CancellationToken cancellationToken = default);

    Task<string?> UpdateAsync(
        long ticketId,
        AdminUpdateSupportTicketRequest request,
        CancellationToken cancellationToken = default);

    Task<SupportTicketThreadDto?> GetThreadAsync(
        long ticketId,
        CancellationToken cancellationToken = default);

    Task<string?> PostStaffReplyAsync(
        long staffUserId,
        long ticketId,
        string body,
        CancellationToken cancellationToken = default);
}
