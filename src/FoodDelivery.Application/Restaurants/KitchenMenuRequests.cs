namespace FoodDelivery.Application.Restaurants;

public sealed record KitchenMenuCreateCategoryRequest(string Name, int? SortOrder);

public sealed record KitchenMenuUpdateCategoryRequest(string? Name, int? SortOrder);

public sealed record KitchenMenuCreateItemRequest(
    long MenuCategoryId,
    string Name,
    decimal Price,
    string? Description,
    bool IsAvailable,
    bool IsFeatured = false);

public sealed record KitchenMenuUpdateItemRequest(
    string? Name,
    string? Description,
    decimal? Price,
    bool? IsAvailable,
    bool? IsFeatured);

