namespace FoodDelivery.Application.Admin;

public interface IAdminFoodCategoriesService
{
    Task<IReadOnlyList<AdminFoodCategoryRowDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<(bool ok, long? id, string? error)> CreateAsync(
        long adminUserId,
        AdminFoodCategoryCreateRequest request,
        CancellationToken cancellationToken = default);

    Task<string?> UpdateAsync(
        long adminUserId,
        long categoryId,
        AdminFoodCategoryUpdateRequest request,
        CancellationToken cancellationToken = default);

    Task<string?> DeleteAsync(long categoryId, CancellationToken cancellationToken = default);
}
