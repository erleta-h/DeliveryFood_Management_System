namespace FoodDelivery.Application.Admin;

public interface IAdminCustomersService
{
    Task<AdminCustomerListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default);

    Task<string?> SetActiveAsync(long userId, bool isActive, CancellationToken cancellationToken = default);
}
