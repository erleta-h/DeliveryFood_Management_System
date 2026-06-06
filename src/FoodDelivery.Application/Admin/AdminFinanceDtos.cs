namespace FoodDelivery.Application.Admin;

public sealed record AdminPaymentListItemDto(
    long Id,
    long OrderId,
    string OrderNumber,
    string? RestaurantName,
    string? CustomerEmail,
    string? CustomerName,
    decimal Amount,
    string Currency,
    int Status,
    string Provider,
    DateTime CreatedAt);

public sealed record AdminPaymentListResultDto(
    IReadOnlyList<AdminPaymentListItemDto> Items,
    int Total,
    int Page,
    int PageSize,
    decimal SumCapturedAmount,
    decimal SumPendingAmount,
    decimal SumRefundedAmount,
    int PendingCount,
    int RefundedCount);
