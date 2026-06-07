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
    string? RestaurantName,
    string? RestaurantCity,
    string? DriverDisplayName,
    int Status,
    int ReportCount);

public sealed record AdminReviewListResultDto(
    IReadOnlyList<AdminReviewListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminReviewStatsDto(
    int Total,
    decimal AverageRating,
    int Reported,
    int Hidden,
    int? TotalChangePercent,
    decimal AverageRatingChange,
    int ReportedChange,
    int HiddenChange);

public sealed record AdminReviewListQuery(
    int Page = 1,
    int PageSize = 15,
    string? Search = null,
    int? Status = null,
    int? Subject = null,
    int? Rating = null,
    DateTime? FromUtc = null,
    DateTime? ToUtc = null);

public sealed record AdminReviewSetStatusRequest(int Status);
