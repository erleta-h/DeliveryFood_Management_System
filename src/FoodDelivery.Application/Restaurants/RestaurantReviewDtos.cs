namespace FoodDelivery.Application.Restaurants;

public sealed record RestaurantReviewDto(
    long Id,
    int Rating,
    string? Comment,
    DateTime CreatedAtUtc,
    string AuthorDisplayName);

public sealed record RestaurantReviewsResultDto(
    decimal AverageRating,
    int TotalCount,
    IReadOnlyList<RestaurantReviewDto> Items);
