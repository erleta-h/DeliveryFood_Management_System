namespace FoodDelivery.Application.Admin;

public interface IAdminSettingsService
{
    Task<IReadOnlyList<AdminSettingItemDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<string?> UpsertAsync(AdminSettingUpsertRequest request, CancellationToken cancellationToken = default);
}
