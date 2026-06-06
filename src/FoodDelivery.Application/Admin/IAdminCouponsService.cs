namespace FoodDelivery.Application.Admin;

public interface IAdminCouponsService
{
    Task<AdminCouponStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);

    Task<AdminCouponListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        string? sort,
        CancellationToken cancellationToken = default);

    Task<AdminCouponDetailDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<(bool ok, long? id, string? error)> CreateAsync(
        AdminCouponCreateRequest request,
        CancellationToken cancellationToken = default);

    Task<string?> SetActiveAsync(long id, bool isActive, CancellationToken cancellationToken = default);
}
