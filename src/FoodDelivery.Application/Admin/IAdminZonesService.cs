namespace FoodDelivery.Application.Admin;

public interface IAdminZonesService
{
    Task<IReadOnlyList<AdminCityZoneDto>> ListCitySummariesAsync(CancellationToken cancellationToken = default);

    Task<DeliveryZoneStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);

    Task<DeliveryZoneListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        string? sort,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DeliveryZoneOptionDto>> ListOptionsAsync(CancellationToken cancellationToken = default);

    Task<DeliveryZoneDetailDto?> GetDetailAsync(long id, CancellationToken cancellationToken = default);

    Task<(DeliveryZoneDetailDto? Result, string? Error)> CreateAsync(
        CreateDeliveryZoneRequest request,
        long? adminUserId = null,
        CancellationToken cancellationToken = default);

    Task<(DeliveryZoneDetailDto? Result, string? Error)> UpdateAsync(
        long id,
        UpdateDeliveryZoneRequest request,
        long? adminUserId = null,
        CancellationToken cancellationToken = default);

    Task<string?> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
