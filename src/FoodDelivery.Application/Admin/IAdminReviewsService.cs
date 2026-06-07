namespace FoodDelivery.Application.Admin;

public interface IAdminReviewsService
{
    Task<AdminReviewStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);

    Task<AdminReviewListResultDto> ListAsync(
        AdminReviewListQuery query,
        CancellationToken cancellationToken = default);

    Task<string?> SetStatusAsync(
        long reviewId,
        int status,
        long? adminUserId,
        CancellationToken cancellationToken = default);

    Task<string?> DeleteAsync(long reviewId, CancellationToken cancellationToken = default);
}
