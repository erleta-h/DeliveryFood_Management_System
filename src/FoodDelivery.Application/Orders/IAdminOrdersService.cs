namespace FoodDelivery.Application.Orders;

public interface IAdminOrdersService
{
    Task<AdminOrderListResultDto> ListAsync(AdminOrderListQuery query, CancellationToken cancellationToken = default);

    Task<string?> UpdateStatusAsync(long adminUserId, long orderId, int newStatus, CancellationToken cancellationToken = default);

    Task<string?> CancelAsync(long adminUserId, long orderId, CancellationToken cancellationToken = default);

    Task<string?> RefundAsync(long adminUserId, long orderId, CancellationToken cancellationToken = default);
}
