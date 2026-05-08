namespace FoodDelivery.Application.Drivers;

public interface IAdminDriverApplicationService
{
    Task<IReadOnlyList<DriverApplicationListItemDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<(ApproveDriverApplicationResultDto? Result, string? Error)> ApproveAsync(
        long applicationId,
        ApproveDriverApplicationRequest request,
        long approvedByUserId,
        CancellationToken cancellationToken = default);

    Task<string?> RejectAsync(long applicationId, long rejectedByUserId, CancellationToken cancellationToken = default);
}
