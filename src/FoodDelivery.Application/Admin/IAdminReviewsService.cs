namespace FoodDelivery.Application.Admin;

public interface IAdminReviewsService
{
    Task<AdminReviewListResultDto> ListAsync(int page, int pageSize, CancellationToken cancellationToken = default);

    Task<string?> DeleteAsync(long reviewId, CancellationToken cancellationToken = default);
}
