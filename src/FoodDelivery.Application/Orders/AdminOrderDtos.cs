namespace FoodDelivery.Application.Orders;

public sealed record AdminOrderListQuery(
    DateTime? FromUtc,
    DateTime? ToUtc,
    int? Status,
    long? RestaurantId,
    long? CustomerUserId,
    int Page,
    int PageSize);

public sealed record AdminOrderPaymentDto(long Id, decimal Amount, string Currency, string Provider, int Status);

public sealed record AdminOrderListItemDto(
    long Id,
    string OrderNumber,
    DateTime PlacedAtUtc,
    int Status,
    decimal Total,
    long RestaurantId,
    string RestaurantName,
    long CustomerUserId,
    string CustomerEmail,
    IReadOnlyList<AdminOrderPaymentDto> Payments);

public sealed record AdminOrderListResultDto(
    IReadOnlyList<AdminOrderListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public sealed record AdminUpdateOrderStatusRequest(int Status);

