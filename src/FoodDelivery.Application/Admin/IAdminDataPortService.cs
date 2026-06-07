namespace FoodDelivery.Application.Admin;

public interface IAdminDataPortService
{
    Task<(byte[] bytes, string contentType, string fileName)> ExportAsync(
        string resource,
        string format,
        CancellationToken cancellationToken = default);

    Task<string?> ImportAsync(
        string resource,
        string format,
        Stream body,
        long? adminUserId = null,
        CancellationToken cancellationToken = default);
}
