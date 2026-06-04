namespace FoodDelivery.Application.Drivers;

public interface IAdminDriverApplicationService
{
    Task<DriverApplicationStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DriverApplicationListItemDto>> ListAsync(
        DriverApplicationListQuery? query,
        CancellationToken cancellationToken = default);

    Task<DriverApplicationDetailDto?> GetDetailAsync(long id, CancellationToken cancellationToken = default);

    Task<(string? PhysicalPath, string? ContentType, string? Error)> GetDocumentFileAsync(
        long applicationId,
        string kind,
        CancellationToken cancellationToken = default);

    Task<(ApproveDriverApplicationResultDto? Result, string? Error)> ApproveAsync(
        long applicationId,
        long approvedByUserId,
        bool includeDevActivationUrl,
        CancellationToken cancellationToken = default);

    Task<string?> RejectAsync(
        long applicationId,
        RejectDriverApplicationRequest request,
        long rejectedByUserId,
        CancellationToken cancellationToken = default);

    Task<(bool Sent, string? Error)> ResendActivationEmailAsync(
        long applicationId,
        long actorUserId,
        bool includeDevActivationUrl,
        CancellationToken cancellationToken = default);
}
