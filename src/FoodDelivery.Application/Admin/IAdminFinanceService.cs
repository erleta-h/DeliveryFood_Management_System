namespace FoodDelivery.Application.Admin;

public interface IAdminFinanceService
{
    Task<AdminPaymentListResultDto> ListPaymentsAsync(
        int page,
        int pageSize,
        DateTime? fromUtc,
        DateTime? toUtc,
        int? status,
        string? provider,
        CancellationToken cancellationToken = default);
}
