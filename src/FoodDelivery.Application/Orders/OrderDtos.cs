
namespace FoodDelivery.Application.Orders;

public record PlaceOrderLineDto(long MenuItemId, int Quantity);

public record PlaceOrderRequest(
    long RestaurantId,
    IReadOnlyList<PlaceOrderLineDto> Lines,
    string? CustomerNotes,
    int FulfillmentType = OrderFulfillmentType.Delivery);

public record CustomerOrderSummaryDto(
    long Id,
    string OrderNumber,
    long RestaurantId,
    string RestaurantName,
    DateTime PlacedAtUtc,
    int Status,
    int FulfillmentType,
    decimal Total);

public record CustomerOrderItemDto(string Name, int Quantity, decimal UnitPrice, decimal LineTotal);

public record CustomerOrderDetailDto(
    long Id,
    string OrderNumber,
    long RestaurantId,
    string RestaurantName,
    DateTime PlacedAtUtc,
    int Status,
    int FulfillmentType,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal Total,
    string? CustomerNotes,
    string ContactPhone,
    string AddressLine1,
    string City,
    string? PostalCode,
    IReadOnlyList<CustomerOrderItemDto> Items);

public record KitchenOrderLineDto(string Name, int Quantity, decimal UnitPrice);

/// <summary>Kontekst për panelin e stafit — duhet një rresht në RestaurantStaff.</summary>
public record KitchenStaffContextResponse(
    bool IsLinked,
    long? RestaurantId,
    string? RestaurantName,
    string? Slug);

/// <param name="Note">P.sh. arsye refuzimi — ruhet në histori statusi dhe audit (admin).</param>
public record UpdateKitchenOrderStatusRequest(int Status, string? Note);
public record KitchenAssignableDriverDto(long UserId, string DisplayName, string VehicleType);
public record KitchenOrderDto(
    long Id,
    string OrderNumber,
    DateTime PlacedAtUtc,
    int Status,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal Total,
    string? CustomerNotes,
    string CustomerFirstName,
    string CustomerLastName,
    string ContactPhone,
    string AddressLine1,
    string City,
    string? PostalCode,
    int EstimatedPrepMinutes,
    string FulfillmentType,
    string? AssignedDriverDisplay,
    IReadOnlyList<KitchenOrderLineDto> Lines);

/// <summary>Statistika ditore (UTC) për tabletin e kuzhinës.</summary>
public record KitchenTodayStatsDto(int OrdersCount, int CompletedCount, decimal RevenueTotal);
