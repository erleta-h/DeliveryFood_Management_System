namespace FoodDelivery.Application.Admin;

public interface IAdminDriversService
{
    Task<AdminDriverListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search = null,
        string? status = null,
        CancellationToken cancellationToken = default);

    Task<string?> PatchAsync(long userId, AdminDriverPatchRequest request, CancellationToken cancellationToken = default);
}
