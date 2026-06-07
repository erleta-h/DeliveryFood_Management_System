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

public sealed record AdminOrderItemDto(
    string Name,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public sealed record AdminOrderStatusHistoryDto(
    long Id,
    int Status,
    string? Note,
    DateTime CreatedAtUtc);

public sealed record AdminOrderDetailDto(
    long Id,
    string OrderNumber,
    DateTime PlacedAtUtc,
    int Status,
    int FulfillmentType,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal DiscountTotal,
    decimal Total,
    long RestaurantId,
    string RestaurantName,
    long CustomerUserId,
    string CustomerEmail,
    string? CustomerPhone,
    string? CustomerNotes,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string? PostalCode,
    IReadOnlyList<AdminOrderItemDto> Items,
    IReadOnlyList<AdminOrderPaymentDto> Payments,
    IReadOnlyList<AdminOrderStatusHistoryDto> StatusHistory);

