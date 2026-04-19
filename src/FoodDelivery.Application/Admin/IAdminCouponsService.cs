namespace FoodDelivery.Application.Admin;

public interface IAdminCouponsService
{
    Task<AdminCouponListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? sort,
        CancellationToken cancellationToken = default);

    Task<(bool ok, long? id, string? error)> CreateAsync(AdminCouponCreateRequest request, CancellationToken cancellationToken = default);

    Task<string?> SetActiveAsync(long id, bool isActive, CancellationToken cancellationToken = default);
}
