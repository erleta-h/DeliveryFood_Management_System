namespace FoodDelivery.Application.Admin;

public sealed record AdminPaymentListItemDto(
    long Id,
    string OrderNumber,
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
    decimal SumCapturedAmount);
