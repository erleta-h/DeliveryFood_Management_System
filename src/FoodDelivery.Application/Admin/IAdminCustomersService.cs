namespace FoodDelivery.Application.Admin;

public interface IAdminCustomersService
{
    Task<AdminCustomerListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        string? sort,
        DateTime? registeredFromUtc,
        DateTime? registeredToUtc,
        CancellationToken cancellationToken = default);

    Task<AdminCustomerStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);

    Task<string?> SetActiveAsync(long userId, bool isActive, CancellationToken cancellationToken = default);
}
