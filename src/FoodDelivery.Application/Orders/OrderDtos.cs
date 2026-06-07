
namespace FoodDelivery.Application.Orders;

public record PlaceOrderLineDto(long MenuItemId, int Quantity);


/// <summary>Adresë dorëzimi vetëm për këtë porosi (ruhet si rresht i ri në adresat e klientit, jo default).</summary>
public record PlaceOrderOneTimeAddressDto(
    string Line1,
    string City,
    string? PostalCode,
    string? Line2);

public record PlaceOrderRequest(
    long RestaurantId,
    IReadOnlyList<PlaceOrderLineDto> Lines,
    string? CustomerNotes,
    int FulfillmentType = OrderFulfillmentType.Delivery,
    int PaymentMethod = OrderPaymentMethod.CashOnDelivery,
    PlaceOrderOneTimeAddressDto? OneTimeDeliveryAddress = null,
    string? CouponCode = null);

/// <summary>Përgjigje POST /api/orders — Stripe kërkon hap të dytë pagese.</summary>
public record PlaceOrderResponse(long OrderId, bool RequiresStripePayment);

public record CustomerOrderSummaryDto(
    long Id,
    string OrderNumber,
    long RestaurantId,
    string RestaurantName,
    DateTime PlacedAtUtc,
    int Status,
    int FulfillmentType,
    decimal Total,
    bool DeliveryChatAvailable);

public record CustomerOrderItemDto(string Name, int Quantity, decimal UnitPrice, decimal LineTotal);

/// <summary>Info e korrierit — null kur nuk ka delivery ose nuk është caktuar ende.</summary>
public record CustomerOrderDriverDto(
    string DisplayName,
    string? Phone,
    string? VehicleType,
    string? LicensePlate,
    double? Rating);

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
    decimal DiscountTotal,
    string? CouponCode,
    decimal Total,
    string? CustomerNotes,
    string ContactPhone,
    string AddressLine1,
    string City,
    string? PostalCode,
    IReadOnlyList<CustomerOrderItemDto> Items,
    double? RestaurantLatitude,
    double? RestaurantLongitude,
    double? CustomerLatitude,
    double? CustomerLongitude,
    double? DriverLatitude,
    double? DriverLongitude,
    /// <summary>True kur ka dërgesë të pranuar nga korrieri — klienti mund të hapë chat-in.</summary>
    bool DeliveryChatAvailable,
    /// <summary>Faza Deliver (<c>DeliveryDriverLeg</c>); null për pickup ose pa dërgesë.</summary>
    int? DeliveryLegStatus,
    /// <summary>True kur ekziston pagesë Stripe në gjendje «pending» (nuk është kapur ende).</summary>
    bool PendingStripePayment,
    /// <summary>Info e korrierit — null kur nuk ka delivery ose nuk është caktuar ende.</summary>
    CustomerOrderDriverDto? Driver,
    /// <summary>Arsye e anulimit nga restoranti — vetëm kur <see cref="Status"/> është anuluar.</summary>
    string? CancellationReason,
    /// <summary>Vlerësimet e mundshme pas dorëzimit (restorant / deliver).</summary>
    IReadOnlyList<CustomerOrderReviewSlotDto> ReviewSlots);

/// <summary>Një vlerësim i mundshëm për porosi (subjekt restorant ose deliver).</summary>
public record CustomerOrderReviewSlotDto(
    int Subject,
    string Title,
    string Subtitle,
    bool CanSubmit,
    bool IsSubmitted,
    int? Rating,
    string? Comment);

public record SubmitOrderReviewRequest(int Subject, int Rating, string? Comment);

public record SubmitOrderReviewResponse(long ReviewId);

public record DeliveryChatMessageDto(
    long Id,
    long OrderId,
    long SenderUserId,
    /// <summary>"customer" ose "driver" — për stilin në UI.</summary>
    string SenderRole,
    string Body,
    DateTime CreatedAtUtc,
    bool IsDelivered = false,
    DateTime? SeenAtUtc = null);

public record PostDeliveryChatRequest(string Body);

public record KitchenOrderLineDto(string Name, int Quantity, decimal UnitPrice);

/// <summary>Kontekst për panelin e stafit — duhet një rresht në RestaurantStaff.</summary>
public record KitchenStaffContextResponse(
    bool IsLinked,
    long? RestaurantId,
    string? RestaurantName,
    string? Slug);

/// <param name="Note">P.sh. arsye refuzimi — ruhet në histori statusi dhe audit (admin).</param>
public record UpdateKitchenOrderStatusRequest(int Status, string? Note);

public record KitchenAssignableDriverDto(
    long UserId,
    string DisplayName,
    string VehicleType,
    string? Phone,
    string? LicensePlate,
    bool IsOnline,
    double? LastLatitude,
    double? LastLongitude);

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
    long? AssignedDriverUserId,
    IReadOnlyList<KitchenOrderLineDto> Lines,
    /// <summary>Lloji i mjetit nga profili i Deliver (paneli «Gati» kompakt).</summary>
    string? AssignedDriverVehicleType,
    /// <summary>Faza Delivery.Status (DeliveryDriverLeg); null për pickup.</summary>
    int? DeliveryLegStatus,
    DateTime? DeliveryOfferedAtUtc,
    DateTime? DeliveryAcceptedAtUtc,
    DateTime? DeliveryArrivedAtRestaurantUtc,
    double? RestaurantLatitude,
    double? RestaurantLongitude,
    /// <summary>Për dërgesë: koordinatat e adresës së klientit; për pickup null.</summary>
    double? DeliveryDestinationLatitude,
    double? DeliveryDestinationLongitude);

/// <summary>Statistika ditore (UTC) për tabletin e kuzhinës.</summary>
public record KitchenTodayStatsDto(int OrdersCount, int CompletedCount, decimal RevenueTotal);

/// <summary>Historik i porosive të përfunduara / anuluara për restorantin (faqezim).</summary>
public record KitchenOrderHistoryResultDto(
    IReadOnlyList<KitchenOrderDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
