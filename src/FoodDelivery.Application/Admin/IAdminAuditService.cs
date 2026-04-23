namespace FoodDelivery.Application.Admin;

public interface IAdminAuditService
{
    Task<AdminAuditLogListResultDto> ListAsync(int page, int pageSize, CancellationToken cancellationToken = default);
}
