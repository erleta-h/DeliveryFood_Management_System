namespace FoodDelivery.Application.Admin;

public sealed record AdminFoodCategoryRowDto(
    long Id,
    string Name,
    int SortOrder,
    string? Description,
    int RestaurantCount,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record AdminFoodCategoryCreateRequest(string Name, int? SortOrder, string? Description);

public sealed record AdminFoodCategoryUpdateRequest(string? Name, int? SortOrder, string? Description);
