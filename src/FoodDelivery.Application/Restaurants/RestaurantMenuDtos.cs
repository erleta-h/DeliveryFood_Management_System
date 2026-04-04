namespace FoodDelivery.Application.Restaurants;

public record RestaurantMenuItemDto(
    long Id,
    string Name,
    string? Description,
    decimal Price,
    bool IsAvailable,
    string? ImageUrl);

public record RestaurantMenuCategoryDto(
    long Id,
    string Name,
    int SortOrder,
    IReadOnlyList<RestaurantMenuItemDto> Items);
