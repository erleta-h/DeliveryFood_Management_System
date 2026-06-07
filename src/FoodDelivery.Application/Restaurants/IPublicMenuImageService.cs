namespace FoodDelivery.Application.Restaurants;

public interface IPublicMenuImageService
{
    Task<(string PhysicalPath, string Filename)?> GetMenuImageAsync(
        long fileId,
        CancellationToken cancellationToken = default);
}
