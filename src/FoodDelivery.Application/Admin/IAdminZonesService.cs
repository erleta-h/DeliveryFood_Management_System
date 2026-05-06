namespace FoodDelivery.Application.Admin;

public interface IAdminZonesService
{
    Task<IReadOnlyList<AdminCityZoneDto>> ListCitySummariesAsync(CancellationToken cancellationToken = default);
}
