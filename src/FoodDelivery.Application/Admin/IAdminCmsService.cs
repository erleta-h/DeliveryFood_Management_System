namespace FoodDelivery.Application.Admin;

public sealed record AdminCmsEntryDto(string Key, string? Value, string? Description, DateTime? UpdatedAt);

public interface IAdminCmsService
{
    Task<IReadOnlyList<AdminCmsEntryDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<string?> UpsertAsync(string key, string? value, string? description, CancellationToken cancellationToken = default);
}
