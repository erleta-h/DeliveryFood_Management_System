namespace FoodDelivery.Application.Drivers;

public interface IDriverApplicationService
{
    Task<string?> SubmitAsync(SubmitDriverApplicationRequest request, CancellationToken cancellationToken = default);
}
