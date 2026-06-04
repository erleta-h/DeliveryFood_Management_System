namespace FoodDelivery.Application.Drivers;

public interface IDriverApplicationService
{
    Task<string?> SubmitAsync(
        SubmitDriverApplicationRequest request,
        IReadOnlyList<DriverApplicationDocumentUpload>? documents = null,
        CancellationToken cancellationToken = default);
}
