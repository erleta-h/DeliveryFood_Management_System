namespace FoodDelivery.Application.Admin;

public interface IAdminFinanceService
{
    Task<AdminPaymentListResultDto> ListPaymentsAsync(
        int page,
        int pageSize,
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken = default);
}
