namespace FoodDelivery.Application.Partners;

public interface IAdminPartnerApplicationService
{
    Task<IReadOnlyList<PartnerApplicationListItemDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<(ApprovePartnerApplicationResultDto? Result, string? Error)> ApproveAsync(
        long applicationId,
        ApprovePartnerApplicationRequest request,
        long approvedByUserId,
        CancellationToken cancellationToken = default);

    Task<string?> RejectAsync(
        long applicationId,
        long rejectedByUserId,
        CancellationToken cancellationToken = default);

    Task<(ResetPartnerStaffPasswordResultDto? Result, string? Error)> ResetStaffPasswordAsync(
        long applicationId,
        ResetPartnerStaffPasswordRequest request,
        long adminUserId,
        CancellationToken cancellationToken = default);
}
