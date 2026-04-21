namespace FoodDelivery.Application.Admin;

public sealed record AdminReviewListItemDto(
    long Id,
    long OrderId,
    string OrderNumber,
    int Rating,
    int Subject,
    string? Comment,
    DateTime CreatedAt,
    string AuthorEmail,
    string? RestaurantName);

public sealed record AdminReviewListResultDto(
    IReadOnlyList<AdminReviewListItemDto> Items,        
    int Total,
    int Page,
    int PageSize);
