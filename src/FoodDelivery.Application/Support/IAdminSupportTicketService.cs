namespace FoodDelivery.Application.Support;

public interface IAdminSupportTicketService
{
    Task<AdminSupportTicketListResultDto> ListAsync(
        int page, int pageSize, string? search, string? sort,
        int? filterStatus, int? filterCategory, int? filterPriority, long? filterAssignedTo,
        CancellationToken cancellationToken = default);

    Task<string?> UpdateAsync(long ticketId, AdminUpdateSupportTicketRequest request, CancellationToken cancellationToken = default);

    Task<SupportTicketThreadDto?> GetThreadAsync(long ticketId, CancellationToken cancellationToken = default);

    Task<string?> PostStaffReplyAsync(long staffUserId, long ticketId, string body, CancellationToken cancellationToken = default);

    Task<string?> AssignAsync(long ticketId, long agentUserId, long actorUserId, CancellationToken cancellationToken = default);

    Task<string?> ChangeStatusAsync(long ticketId, int newStatus, long actorUserId, CancellationToken cancellationToken = default);

    Task<string?> ChangePriorityAsync(long ticketId, int newPriority, long actorUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportTicketAuditDto>> GetAuditTrailAsync(long ticketId, CancellationToken cancellationToken = default);
}
