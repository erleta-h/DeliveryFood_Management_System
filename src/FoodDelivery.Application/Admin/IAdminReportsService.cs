namespace FoodDelivery.Application.Admin;

public sealed record OperationsReportDto(
    DateTime? FromUtc,
    DateTime? ToUtc,
    int OrderCount,
    decimal OrderTotalSum,
    int ActiveRestaurantCount,
    int CustomerRoleUserCount,
    int OpenSupportTickets,
    int CouponCountActive);

public interface IAdminReportsService
{
    Task<OperationsReportDto> GetOperationsReportAsync(
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken = default);

    Task<(byte[] bytes, string contentType, string fileName)> ExportOperationsReportAsync(
        string format,
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken = default);
}
