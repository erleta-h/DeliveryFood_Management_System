namespace FoodDelivery.Application.Partners;

public interface IPartnerApplicationService
{
    Task<string?> SubmitAsync(SubmitPartnerApplicationRequest request, CancellationToken cancellationToken = default);
}
